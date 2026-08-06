import type { NextFunction, Request, Response } from 'express';
import {
  MEDIA_EXP_PARAM,
  MEDIA_SIG_PARAM,
  verifyPrivateMediaAccess,
} from '../storage/signed-media';

/**
 * `/uploads/bookings/...` yalnız etibarlı HMAC ilə.
 * services/avatars açıq qalır (marketplace SEO).
 */
export function createPrivateUploadsGuard(secret: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const rawPath = req.path.startsWith('/') ? req.path.slice(1) : req.path;
    const uploadKey = decodeURIComponent(rawPath);

    if (!uploadKey.startsWith('bookings/')) {
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
