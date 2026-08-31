import { describe, expect, it, vi } from 'vitest';
import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  NotFoundException,
} from '@nestjs/common';
import { PaymentStatus, UserRole } from '@xidmetal/shared';
import { PaymentsService } from './payments.service';
import { isPaymentsEnabled, PAYMENTS_DISABLED_MESSAGE } from './payments-flag';

describe('payments flag', () => {
  it('default false', () => {
    expect(isPaymentsEnabled(undefined)).toBe(false);
    expect(isPaymentsEnabled('')).toBe(false);
    expect(isPaymentsEnabled('false')).toBe(false);
  });

  it('yalnız true aktivləşdirir', () => {
    expect(isPaymentsEnabled('true')).toBe(true);
    expect(isPaymentsEnabled('TRUE')).toBe(true);
  });

  it('AZ mesajı sabitdir', () => {
    expect(PAYMENTS_DISABLED_MESSAGE).toBe('Ödəniş hələ aktiv deyil');
  });
});

describe('PaymentsService access hardening', () => {
  function makeService(opts: {
    enabled?: boolean;
    booking?: {
      id: string;
      customerId: string;
      providerId: string;
      totalPrice: number;
    } | null;
    payment?: {
      id: string;
      bookingId: string | null;
      amount: { toString(): string };
      commission: { toString(): string };
      currency: string;
      status: string;
      provider: string;
      externalId: string | null;
      idempotencyKey: string | null;
      createdAt: Date;
      updatedAt: Date;
    } | null;
  }) {
    const booking = opts.booking;
    const payment = opts.payment ?? null;
    const enabled = opts.enabled ?? true;

    const prisma = {
      payment: {
        findUnique: vi.fn(async (args: { where: Record<string, unknown> }) => {
          if ('id' in args.where) return payment;
          return null;
        }),
        create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
          id: 'pay-new',
          bookingId: data.bookingId,
          amount: data.amount,
          commission: data.commission,
          currency: data.currency,
          status: data.status,
          provider: data.provider,
          externalId: data.externalId,
          idempotencyKey: data.idempotencyKey ?? null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
        update: vi.fn(),
      },
      booking: {
        findUnique: vi.fn(async () =>
          booking
            ? {
                ...booking,
                totalPrice: { toString: () => String(booking.totalPrice) },
              }
            : null,
        ),
      },
    };

    return {
      svc: new PaymentsService(
        prisma as never,
        {
          get: (key: string) =>
            key === 'PAYMENTS_ENABLED' ? (enabled ? 'true' : 'false') : undefined,
        } as never,
        {
          findExisting: vi.fn(async () => ({ hit: false as const })),
          save: vi.fn(),
        } as never,
        {
          createIntent: vi.fn(async () => ({
            status: PaymentStatus.REQUIRES_PAYMENT,
            provider: 'noop',
            externalId: 'ext_1',
          })),
          authorizeHold: vi.fn(),
          capture: vi.fn(),
          refund: vi.fn(),
        } as never,
        { incPaymentIntent: vi.fn() } as never,
      ),
      prisma,
    };
  }

  it('flag OFF → 501', async () => {
    const { svc } = makeService({
      enabled: false,
      booking: {
        id: 'b1',
        customerId: 'c1',
        providerId: 'p1',
        totalPrice: 40,
      },
    });
    await expect(
      svc.createIntent('c1', UserRole.CUSTOMER, { bookingId: 'b1' }),
    ).rejects.toBeInstanceOf(HttpException);
  });

  it('uyğunsuz amount rədd edilir', async () => {
    const { svc } = makeService({
      booking: {
        id: 'b1',
        customerId: 'c1',
        providerId: 'p1',
        totalPrice: 50,
      },
    });
    await expect(
      svc.createIntent('c1', UserRole.CUSTOMER, {
        bookingId: 'b1',
        amount: 99,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('yalnız sifariş sahibi ödəniş yarada bilər', async () => {
    const { svc } = makeService({
      booking: {
        id: 'b1',
        customerId: 'c1',
        providerId: 'p1',
        totalPrice: 50,
      },
    });
    await expect(
      svc.createIntent('p1', UserRole.PROVIDER, { bookingId: 'b1' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('orphan payment (bookingId null) əlçatan deyil', async () => {
    const { svc } = makeService({
      payment: {
        id: 'pay1',
        bookingId: null,
        amount: { toString: () => '10' },
        commission: { toString: () => '0' },
        currency: 'AZN',
        status: PaymentStatus.REQUIRES_PAYMENT,
        provider: 'noop',
        externalId: 'x',
        idempotencyKey: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    await expect(
      svc.findOne('c1', UserRole.CUSTOMER, 'pay1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('xidmət alan booking məbləği ilə intent yaradır', async () => {
    const { svc, prisma } = makeService({
      booking: {
        id: 'b1',
        customerId: 'c1',
        providerId: 'p1',
        totalPrice: 50,
      },
    });
    const summary = await svc.createIntent('c1', UserRole.CUSTOMER, {
      bookingId: 'b1',
    });
    expect(summary.amount).toBe(50);
    expect(summary.bookingId).toBe('b1');
    expect(prisma.payment.create).toHaveBeenCalled();
  });

  it('capture yalnız AUTHORIZED statusdan mümkündür', async () => {
    const { ConflictException } = await import('@nestjs/common');
    const { svc } = makeService({
      booking: {
        id: 'b1',
        customerId: 'c1',
        providerId: 'p1',
        totalPrice: 10,
      },
      payment: {
        id: 'pay1',
        bookingId: 'b1',
        amount: { toString: () => '10' },
        commission: { toString: () => '0' },
        currency: 'AZN',
        status: PaymentStatus.REQUIRES_PAYMENT,
        provider: 'noop',
        externalId: 'x',
        idempotencyKey: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    await expect(
      svc.capture('c1', UserRole.CUSTOMER, 'pay1', {}),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

describe('StripePaymentProvider stub', () => {
  it('bütün əməliyyatlar 501 verir', async () => {
    const { StripePaymentProvider } = await import('./payment-provider');
    const { HttpException } = await import('@nestjs/common');
    const provider = new StripePaymentProvider({
      get: () => undefined,
    } as never);

    await expect(
      provider.createIntent({ amount: 10, currency: 'AZN' }),
    ).rejects.toBeInstanceOf(HttpException);
    await expect(provider.authorizeHold('x')).rejects.toBeInstanceOf(HttpException);
    await expect(provider.capture('x')).rejects.toBeInstanceOf(HttpException);
    await expect(provider.refund('x')).rejects.toBeInstanceOf(HttpException);
  });
});
