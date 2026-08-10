import type { NextFunction, Request, Response } from 'express';
import {
  MEDIA_EXP_PARAM,
  MEDIA_SIG_PARAM,
  isPrivateUploadKey,
  verifyPrivateMediaAccess,
} from '../storage/signed-media';

/** `..` / boş seqment / null byte — path traversal qarşısı */
function normalizeUploadKey(rawPath: string): string | null {
  const raw = rawPath.startsWith('/') ? rawPath.slice(1) : rawPath;
  let decoded: string;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return null;
  }
  if (!decoded || decoded.includes('\0')) return null;
  const parts = decoded.split('/');
  if (parts.some((part) => part === '' || part === '.' || part === '..')) {
    return null;
  }
  return parts.join('/');
}

/** `/uploads/...` private media yalnız etibarlı imza ilə açılır. */
export function createPrivateUploadsGuard(secret: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const uploadKey = normalizeUploadKey(req.path);
    if (!uploadKey) {
      res.status(400).json({
        statusCode: 400,
        message: 'Etibarsız fayl yolu',
      });
      return;
    }

    if (!isPrivateUploadKey(uploadKey)) {
      next();
      return;
    }

    const expRaw = typeof req.query[MEDIA_EXP_PARAM] === 'string'
      ? req.query[MEDIA_EXP_PARAM]
      : undefined;
    const sigRaw = typeof req.query[MEDIA_SIG_PARAM] === 'string'
      ? req.query[MEDIA_SIG_PARAM]
      : undefined;

    const ok = verifyPrivateMediaAccess({
      uploadKey,
      expRaw,
      sigRaw,
      secret,
    });

    if (!ok) {
      res.status(403).json({
        statusCode: 403,
        message: 'Bu fayla giriş icazəniz yoxdur və ya linkin müddəti bitib',
      });
      return;
    }

    next();
  };
}
