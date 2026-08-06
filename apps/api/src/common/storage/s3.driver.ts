import { randomUUID } from 'crypto';
import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import type { StorageDriver, StoredObject } from './storage.types';

export class S3StorageDriver implements StorageDriver {
  private readonly client: S3Client;

  constructor(
    private readonly bucket: string,
    private readonly publicBaseUrl: string,
    endpoint: string | undefined,
    region: string,
    accessKeyId: string,
    secretAccessKey: string,
  ) {
    this.client = new S3Client({
      region,
      endpoint: endpoint || undefined,
      forcePathStyle: Boolean(endpoint),
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  async upload(params: {
    buffer: Buffer;
    contentType: string;
    folder: string;
    extension: string;
  }): Promise<StoredObject> {
    const key = `${params.folder}/${randomUUID()}.${params.extension}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: params.buffer,
        ContentType: params.contentType,
      }),
    );

    const base = this.publicBaseUrl.replace(/\/$/, '');
    return {
      key,
      url: `${base}/${key}`,
    };
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }

  keyFromPublicUrl(url: string): string | null {
    const base = this.publicBaseUrl.replace(/\/$/, '');
    if (!url.startsWith(`${base}/`)) {
      return null;
    }
    const key = url.slice(base.length + 1);
    if (!key || key.includes('..')) {
      return null;
    }
    return key;
  }
}
