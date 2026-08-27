import {
  formatBookingOrderNumber,
  parseBookingOrderNumberSearch,
} from '@xidmetal/shared';
import type { Prisma } from '@prisma/client';

type SeqClient = Pick<Prisma.TransactionClient, '$queryRaw'>;

/**
 * Eyni transaction-da sequence-dən növbəti nömrəni götürür.
 * Sequence rollback olunmur — boşluq (failed insert) gözləniləndir, təkrar yox.
 */
export async function allocateBookingOrderNumber(
  db: SeqClient,
  at: Date = new Date(),
): Promise<string> {
  const rows = await db.$queryRaw<Array<{ seq: bigint }>>`
    SELECT nextval('booking_order_number_seq')::bigint AS seq
  `;
  const seq = rows[0]?.seq;
  if (seq === undefined || seq < 1n) {
    throw new Error('Sifariş nömrəsi yaradıla bilmədi');
  }
  return formatBookingOrderNumber(Number(seq), at);
}

/** Siyahı `where`-inə sifariş nömrəsi axtarışı. Boş/undefined → filtr yoxdur. */
export function bookingOrderNumberSearchWhere(
  search?: string,
): Prisma.BookingWhereInput | undefined {
  const trimmed = search?.trim();
  if (!trimmed) return undefined;

  const parsed = parseBookingOrderNumberSearch(trimmed);
  if (!parsed) {
    return { orderNumber: { equals: '__NO_MATCH__' } };
  }
  if (parsed.type === 'equals') {
    return { orderNumber: parsed.value };
  }
  return {
    orderNumber: { contains: parsed.value, mode: 'insensitive' },
  };
}
