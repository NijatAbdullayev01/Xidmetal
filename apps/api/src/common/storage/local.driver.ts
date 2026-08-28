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
    if (!this.isSafeStorageKey(key)) {
      return;
    }
    const absolutePath = path.join(this.rootDir, key);
    const root = path.resolve(this.rootDir);
    const resolved = path.resolve(absolutePath);
    const prefix = root.endsWith(path.sep) ? root : `${root}${path.sep}`;
    if (resolved !== root && !resolved.startsWith(prefix)) {
      return;
    }
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
    if (!this.isSafeStorageKey(key)) {
      return null;
    }
    return key;
  }

  /** `..` / absolute / boş seqment — path traversal qarşısı */
  private isSafeStorageKey(key: string): boolean {
    if (!key || key.includes('\0') || path.isAbsolute(key)) return false;
    const parts = key.split(/[/\\]/);
    return parts.every((part) => part.length > 0 && part !== '.' && part !== '..');
  }
}
