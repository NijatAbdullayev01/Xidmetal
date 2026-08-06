import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'crypto';

export const REQUEST_ID_HEADER = 'x-request-id';

/** Korrelyasiya ID — client göndərməsə server yaradır */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.headers[REQUEST_ID_HEADER];
  const raw = Array.isArray(incoming) ? incoming[0] : incoming;
  const id =
    typeof raw === 'string' && raw.trim().length > 0 && raw.length <= 128
      ? raw.trim()
      : randomUUID();

  (req as Request & { requestId?: string }).requestId = id;
  res.setHeader(REQUEST_ID_HEADER, id);
  next();
}
