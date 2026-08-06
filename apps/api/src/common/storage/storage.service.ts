import { BadRequestException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Express } from 'express';
import { PrismaService } from '../database/prisma.service';
import { detectImageMime } from './image-mime';
import { LocalStorageDriver } from './local.driver';
import { S3StorageDriver } from './s3.driver';
import {
  MAX_UPLOAD_BYTES,
  MAX_UPLOADS_PER_USER_PER_HOUR,
  STORAGE_DRIVER,
  UPLOAD_ORPHAN_TTL_MS,
  type StorageDriver,
  type StoredObject,
  type UploadFolder,
} from './storage.types';
import { collectMediaBaseUrls, isAllowedMediaUrl } from './allowed-media-url';
import { signPrivateMediaUrl, stripMediaSignature } from './signed-media';

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const ORPHAN_SWEEP_INTERVAL_MS = 60 * 60 * 1000;

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly driver: StorageDriver;
  private readonly logger = new Logger(StorageService.name);
  private sweepTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    const mode = (this.config.get<string>('STORAGE_DRIVER') ?? STORAGE_DRIVER.LOCAL).toLowerCase();

    if (mode === STORAGE_DRIVER.S3) {
      const bucket = this.config.getOrThrow<string>('S3_BUCKET');
      const publicBaseUrl = this.config.getOrThrow<string>('S3_PUBLIC_URL');
      const accessKeyId = this.config.getOrThrow<string>('S3_ACCESS_KEY_ID');
      const secretAccessKey = this.config.getOrThrow<string>('S3_SECRET_ACCESS_KEY');
      const region = this.config.get<string>('S3_REGION', 'auto');
      const endpoint = this.config.get<string>('S3_ENDPOINT');

      this.driver = new S3StorageDriver(
        bucket,
        publicBaseUrl,
        endpoint,
        region,
        accessKeyId,
        secretAccessKey,
      );
      return;
    }

    const rootDir = this.config.get<string>('STORAGE_LOCAL_DIR', './uploads');
    const apiUrl = this.config.get<string>('API_URL', 'http://localhost:4000');
    const publicBaseUrl = this.config.get<string>(
      'STORAGE_PUBLIC_BASE_URL',
      `${apiUrl.replace(/\/$/, '')}/uploads`,
    );
    this.driver = new LocalStorageDriver(rootDir, publicBaseUrl);
  }

  onModuleInit(): void {
    // İlk sweep bir qədər gecikmə ilə — boot-u bloklamır
    setTimeout(() => {
      void this.purgeOrphanUploads();
    }, 15_000);

    this.sweepTimer = setInterval(() => {
      void this.purgeOrphanUploads();
    }, ORPHAN_SWEEP_INTERVAL_MS);
    this.sweepTimer.unref?.();
  }

  /** Avatar / xidmət / sifariş şəkilləri yalnız öz storage host-umuzdan */
  assertAllowedMediaUrl(
    url: string,
    message = 'Yalnız platforma yükləmələrindən şəkil URL istifadə edin',
  ): void {
    const canonical = stripMediaSignature(url);
    const bases = collectMediaBaseUrls({
      storagePublicBaseUrl: this.config.get<string>('STORAGE_PUBLIC_BASE_URL'),
      apiUrl: this.config.get<string>('API_URL'),
      s3PublicUrl: this.config.get<string>('S3_PUBLIC_URL'),
    });
    if (!isAllowedMediaUrl(canonical, bases)) {
      throw new BadRequestException(message);
    }
  }

  /** DB-də saxlamaq üçün imzasız canonical URL */
  toCanonicalMediaUrl(url: string): string {
    return stripMediaSignature(url);
  }

  /** Brauzerə qaytarılarkən private (bookings) URL-ləri imzala */
  toReadableMediaUrl(url: string | null | undefined): string | undefined {
    if (!url) return undefined;
    const canonical = stripMediaSignature(url);
    const secret = this.config.get<string>('JWT_SECRET', '');
    return signPrivateMediaUrl(canonical, secret);
  }

  async uploadImage(
    file: Express.Multer.File,
    folder: UploadFolder,
    userId: string,
  ): Promise<StoredObject> {
    if (!file) {
      throw new BadRequestException('Şəkil faylı tələb olunur');
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      throw new BadRequestException('Şəkil maksimum 1 MB ola bilər');
    }

    const since = new Date(Date.now() - 60 * 60 * 1000);
    const recentCount = await this.prisma.uploadedObject.count({
      where: { userId, createdAt: { gte: since } },
    });
    if (recentCount >= MAX_UPLOADS_PER_USER_PER_HOUR) {
      throw new BadRequestException(
        `Saatda maksimum ${MAX_UPLOADS_PER_USER_PER_HOUR} şəkil yükləyə bilərsiniz`,
      );
    }

    const detected = detectImageMime(file.buffer);
    if (!detected) {
      throw new BadRequestException('Yalnız JPG, PNG və ya WEBP formatı qəbul edilir');
    }

    if (file.mimetype && file.mimetype !== detected && file.mimetype !== 'application/octet-stream') {
      throw new BadRequestException('Fayl tipi elan edilən formatla uyğun gəlmir');
    }

    const extension = EXT_BY_MIME[detected];
    if (!extension) {
      throw new BadRequestException('Dəstəklənməyən şəkil formatı');
    }

    // Ownership: folder/userId/uuid.ext
    const ownedFolder = `${folder}/${userId}`;
    const stored = await this.driver.upload({
      buffer: file.buffer,
      contentType: detected,
      folder: ownedFolder,
      extension,
    });

    await this.prisma.uploadedObject.create({
      data: {
        key: stored.key,
        url: stored.url,
        userId,
        folder,
      },
    });

    const secret = this.config.get<string>('JWT_SECRET', '');
    return {
      ...stored,
      url: signPrivateMediaUrl(stored.url, secret),
    };
  }

  /** Bizim storage-dakı köhnə obyekti silir (best-effort). */
  async deleteByPublicUrl(url: string | null | undefined): Promise<void> {
    if (!url) return;
    const key = this.driver.keyFromPublicUrl(stripMediaSignature(url));
    if (!key) return;

    try {
      await this.driver.delete(key);
      await this.prisma.uploadedObject.deleteMany({ where: { OR: [{ key }, { url }] } });
    } catch (error) {
      this.logger.warn(
        `Orphan silinmə uğursuz (${key}): ${error instanceof Error ? error.message : 'naməlum'}`,
      );
    }
  }

  async deleteManyByPublicUrls(urls: Array<string | null | undefined>): Promise<void> {
    const unique = [...new Set(urls.filter((u): u is string => Boolean(u)))];
    await Promise.all(unique.map((url) => this.deleteByPublicUrl(url)));
  }

  /**
   * Referenced olmayan köhnə upload-ları silir (TTL + DB check).
   * Referenced: service_images, users.avatar_url, bookings.image_url.
   */
  async purgeOrphanUploads(): Promise<number> {
    const cutoff = new Date(Date.now() - UPLOAD_ORPHAN_TTL_MS);
    const candidates = await this.prisma.uploadedObject.findMany({
      where: { createdAt: { lt: cutoff } },
      take: 200,
      orderBy: { createdAt: 'asc' },
    });

    if (candidates.length === 0) return 0;

    const urls = candidates.map((c) => c.url);
    const [serviceHits, avatarHits, bookingHits] = await Promise.all([
      this.prisma.serviceImage.findMany({
        where: { url: { in: urls } },
        select: { url: true },
      }),
      this.prisma.user.findMany({
        where: { avatarUrl: { in: urls } },
        select: { avatarUrl: true },
      }),
      this.prisma.booking.findMany({
        where: { imageUrl: { in: urls } },
        select: { imageUrl: true },
      }),
    ]);

    const referenced = new Set<string>([
      ...serviceHits.map((r) => r.url),
      ...avatarHits.map((r) => r.avatarUrl).filter((u): u is string => Boolean(u)),
      ...bookingHits.map((r) => r.imageUrl).filter((u): u is string => Boolean(u)),
    ]);

    let purged = 0;
    for (const candidate of candidates) {
      if (referenced.has(candidate.url)) continue;
      try {
        await this.driver.delete(candidate.key);
        await this.prisma.uploadedObject.delete({ where: { id: candidate.id } });
        purged += 1;
      } catch (error) {
        this.logger.warn(
          `Orphan purge uğursuz (${candidate.key}): ${
            error instanceof Error ? error.message : 'naməlum'
          }`,
        );
      }
    }

    if (purged > 0) {
      this.logger.log(`Orphan upload təmizliyi: ${purged} fayl silindi`);
    }
    return purged;
  }
}
