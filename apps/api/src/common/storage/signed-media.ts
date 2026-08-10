import { createHmac, timingSafeEqual } from 'crypto';
import { UPLOAD_FOLDERS } from './storage.types';

/** Query param adları — local booking şəkilləri üçün HMAC */
export const MEDIA_SIG_PARAM = 'sig';
export const MEDIA_EXP_PARAM = 'exp';

const DEFAULT_TTL_SECONDS = 60 * 60; // 1 saat

/** Canonical URL — imza/query-siz (DB-də saxlamaq üçün) */
export function stripMediaSignature(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;

  if (trimmed.startsWith('/')) {
    const q = trimmed.indexOf('?');
    return q === -1 ? trimmed : trimmed.slice(0, q);
  }

  try {
    const parsed = new URL(trimmed);
    parsed.search = '';
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return trimmed;
  }
}

export function isPrivateUploadKey(key: string): boolean {
  return (
    key.startsWith(`${UPLOAD_FOLDERS.BOOKINGS}/`) ||
    key.startsWith(`${UPLOAD_FOLDERS.SERVICES}/`) ||
    key.startsWith(`${UPLOAD_FOLDERS.AVATARS}/`)
  );
}

function hmacHex(secret: string, payload: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

function safeEqualHex(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a, 'hex');
    const bb = Buffer.from(b, 'hex');
    if (ba.length !== bb.length) return false;
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

/**
 * Private upload URL-lərinə qısaömürlü HMAC əlavə edir.
 */
export function signPrivateMediaUrl(
  url: string,
  secret: string,
  ttlSeconds = DEFAULT_TTL_SECONDS,
): string {
  const canonical = stripMediaSignature(url);
  if (!canonical || !secret) return canonical;

  let pathname: string;
  try {
    if (canonical.startsWith('/')) {
      pathname = canonical;
    } else {
      pathname = new URL(canonical).pathname;
    }
  } catch {
    return canonical;
  }

  const key = pathname.replace(/^\/uploads\/?/, '').replace(/^\//, '');
  if (!isPrivateUploadKey(key)) {
    return canonical;
  }

  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = `${key}:${exp}`;
  const sig = hmacHex(secret, payload);

  const sep = canonical.includes('?') ? '&' : '?';
  return `${canonical}${sep}${MEDIA_EXP_PARAM}=${exp}&${MEDIA_SIG_PARAM}=${sig}`;
}

/** Express `/uploads/...` sorğusu üçün imza yoxlaması */
export function verifyPrivateMediaAccess(params: {
  uploadKey: string;
  expRaw: string | undefined;
  sigRaw: string | undefined;
  secret: string;
}): boolean {
  const { uploadKey, expRaw, sigRaw, secret } = params;
  if (!isPrivateUploadKey(uploadKey)) {
    return true;
  }
  if (!secret || !expRaw || !sigRaw) {
    return false;
  }

  const exp = Number(expRaw);
  if (!Number.isFinite(exp) || exp * 1000 < Date.now()) {
    return false;
  }

  const expected = hmacHex(secret, `${uploadKey}:${exp}`);
  return safeEqualHex(expected, sigRaw);
}
