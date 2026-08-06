export const STORAGE_DRIVER = {
  LOCAL: 'local',
  S3: 's3',
} as const;

export type StorageDriverName = (typeof STORAGE_DRIVER)[keyof typeof STORAGE_DRIVER];

export interface StoredObject {
  /** Brauzerdən açıla bilən ictimai URL */
  url: string;
  /** Driver daxilindəki açar / yol */
  key: string;
}

export interface StorageDriver {
  upload(params: {
    buffer: Buffer;
    contentType: string;
    folder: string;
    extension: string;
  }): Promise<StoredObject>;

  /** Açar mövcud deyilsə səssiz keçə bilər */
  delete(key: string): Promise<void>;

  /** Public URL bu driverə aiddirsə daxili açarı qaytarır */
  keyFromPublicUrl(url: string): string | null;
}

export const UPLOAD_FOLDERS = {
  SERVICES: 'services',
  AVATARS: 'avatars',
  BOOKINGS: 'bookings',
} as const;

export type UploadFolder = (typeof UPLOAD_FOLDERS)[keyof typeof UPLOAD_FOLDERS];

export const ALLOWED_IMAGE_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

export const MAX_UPLOAD_BYTES = 1 * 1024 * 1024;

/** İstifadəçi başına saatda maksimum yükləmə */
export const MAX_UPLOADS_PER_USER_PER_HOUR = 30;

/** Referenced olmayan upload-ların TTL-i */
export const UPLOAD_ORPHAN_TTL_MS = 24 * 60 * 60 * 1000;
