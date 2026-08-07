import { createHash } from 'node:crypto';
import { ConflictException } from '@nestjs/common';

/**
 * Saf helper — unit test üçün Nest DI tələb etmir.
 * Payment.idempotencyKey və IdempotencyRecord üçün eyni qaydalar.
 */
export function hashIdempotencyPayload(body: unknown): string {
  return createHash('sha256').update(JSON.stringify(body ?? null)).digest('hex');
}

export function assertIdempotencyPayloadCompatible(
  storedHash: string | null | undefined,
  requestBody: unknown,
): void {
  if (!storedHash) return;
  const next = hashIdempotencyPayload(requestBody);
  if (storedHash !== next) {
    throw new ConflictException(
      'İdempotency açarı fərqli sorğu gövdəsi ilə təkrar istifadə olunub',
    );
  }
}

/** Header / body açar normalizasiyası */
export function normalizeIdempotencyKey(
  raw: string | undefined | null,
): string | null {
  if (raw === undefined || raw === null) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 128);
}
