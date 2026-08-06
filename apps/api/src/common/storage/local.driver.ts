import { mkdir, unlink, writeFile } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import type { StorageDriver, StoredObject } from './storage.types';

export class LocalStorageDriver implements StorageDriver {
  constructor(
    private readonly rootDir: string,
    private readonly publicBaseUrl: string,
  ) {}

  async upload(params: {
    buffer: Buffer;
    contentType: string;
    folder: string;
    extension: string;
  }): Promise<StoredObject> {
    const key = `${params.folder}/${randomUUID()}.${params.extension}`;
    const absolutePath = path.join(this.rootDir, key);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, params.buffer);

    const base = this.publicBaseUrl.replace(/\/$/, '');
    return {
      key,
      url: `${base}/${key}`,
    };
  }

  async delete(key: string): Promise<void> {
    const absolutePath = path.join(this.rootDir, key);
    try {
      await unlink(absolutePath);
    } catch (error) {
      const code =
        error && typeof error === 'object' && 'code' in error
          ? String((error as { code: unknown }).code)
          : '';
      if (code !== 'ENOENT') {
        throw error;
      }
    }
  }

  keyFromPublicUrl(url: string): string | null {
    const base = this.publicBaseUrl.replace(/\/$/, '');
    if (!url.startsWith(`${base}/`)) {
      return null;
    }
    const key = url.slice(base.length + 1);
    if (!key || key.includes('..') || path.isAbsolute(key)) {
      return null;
    }
    return key;
  }
}
