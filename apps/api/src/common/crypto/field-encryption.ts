import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';

/**
 * AES-256-GCM sahə şifrələməsi — kart token-i kimi həssas dəyərləri at-rest
 * şifrələmək üçün. GCM həm məxfiliyi, həm bütövlüyü (auth tag) təmin edir.
 *
 * Format: `<iv_hex>:<tag_hex>:<ciphertext_hex>` — ayrıca IV/TAG sütunu lazım deyil.
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

/** Açarı 32 baytlıq Buffer-ə normallaşdırır (hex açar və ya parol frazası). */
export function resolveEncryptionKey(secret: string): Buffer {
  const trimmed = secret.trim();
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return Buffer.from(trimmed, 'hex');
  }
  return createHash('sha256').update(trimmed, 'utf8').digest();
}

export function encryptField(plaintext: string, key: Buffer): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptField(payload: string, key: Buffer): string {
  const [ivHex, tagHex, dataHex] = payload.split(':');
  if (!ivHex || !tagHex || !dataHex) {
    throw new Error('Şifrəli sahə formatı etibarsızdır');
  }
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return Buffer.concat([
    decipher.update(Buffer.from(dataHex, 'hex')),
    decipher.final(),
  ]).toString('utf8');
}

/** SHA-256 barmaq izi — unikal indeks üçün (plaintext-i ifşa etmədən axtarış). */
export function hashField(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}
