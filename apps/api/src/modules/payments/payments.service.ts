import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PaymentStatus,
  PAYMENTS,
  UserRole,
  type PaymentSummary,
} from '@xidmetal/shared';
import { Prisma } from '@xidmetal/database';
import { PrismaService } from '../../common/database/prisma.service';
import { IdempotencyService } from '../../common/idempotency/idempotency.service';
import {
  assertIdempotencyPayloadCompatible,
  hashIdempotencyPayload,
  normalizeIdempotencyKey,
} from '../../common/idempotency/idempotency.helpers';
import {
  defaultCommission,
  PAYMENT_PROVIDER,
  type PaymentProviderAdapter,
} from './payment-provider';
import type { CreatePaymentIntentDto, PaymentActionDto } from './dto';
import {
  isPaymentsEnabled,
  PAYMENTS_DISABLED_MESSAGE,
} from './payments-flag';
import { MetricsService } from '../../common/metrics/metrics.service';

const AMOUNT_TOLERANCE = 0.01;

type PaymentAccessMode = 'read' | 'pay' | 'refund';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private idempotency: IdempotencyService,
    @Inject(PAYMENT_PROVIDER) private provider: PaymentProviderAdapter,
    private metrics: MetricsService,
  ) {}

  isEnabled(): boolean {
    return isPaymentsEnabled(this.config.get<string>('PAYMENTS_ENABLED'));
  }

  assertEnabled(): void {
    if (!this.isEnabled()) {
      throw new HttpException(
        PAYMENTS_DISABLED_MESSAGE,
        HttpStatus.NOT_IMPLEMENTED,
      );
    }
  }

  async createIntent(
    userId: string,
    role: string,
    dto: CreatePaymentIntentDto,
    headerIdempotencyKey?: string | null,
  ): Promise<PaymentSummary> {
    this.assertEnabled();

    const idempotencyKey = normalizeIdempotencyKey(
      dto.idempotencyKey ?? headerIdempotencyKey,
    );
    const currency = (dto.currency ?? PAYMENTS.DEFAULT_CURRENCY).toUpperCase();
    const route = 'POST /payments/intents';

    if (idempotencyKey) {
      const existingPayment = await this.prisma.payment.findUnique({
        where: { idempotencyKey },
      });
      if (existingPayment) {
        await this.assertPaymentAccess(
          userId,
          role,
          existingPayment.bookingId,
          'pay',
        );
        return this.mapPayment(existingPayment);
      }

      const cached = await this.idempotency.findExisting(
        idempotencyKey,
        userId,
        route,
      );
      if (cached.hit) {
        const body = cached.body as PaymentSummary & { _requestHash?: string };
        assertIdempotencyPayloadCompatible(body._requestHash, {
          bookingId: dto.bookingId,
          amount: dto.amount,
          currency,
        });
        return this.stripInternal(body);
      }
    }

    const booking = await this.prisma.booking.findUnique({
      where: { id: dto.bookingId },
      select: {
        id: true,
        customerId: true,
        providerId: true,
        totalPrice: true,
      },
    });
    if (!booking) {
      throw new NotFoundException('Sifariş tapılmadı');
    }
    if (booking.customerId !== userId) {
      throw new ForbiddenException('Yalnız sifariş sahibi ödəniş yarada bilər');
    }

    const amount = Number(booking.totalPrice);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('Sifariş məbləği ödəniş üçün etibarsızdır');
    }
    if (
      dto.amount !== undefined &&
      Math.abs(dto.amount - amount) > AMOUNT_TOLERANCE
    ) {
      throw new BadRequestException(
        'Göndərilən məbləğ sifariş məbləği ilə uyğun gəlmir',
      );
    }

    const existingForBooking = await this.prisma.payment.findUnique({
      where: { bookingId: dto.bookingId },
    });
    if (existingForBooking) {
      if (
        idempotencyKey &&
        existingForBooking.idempotencyKey === idempotencyKey
      ) {
        return this.mapPayment(existingForBooking);
      }
      throw new ConflictException('Bu sifariş üçün ödəniş artıq mövcuddur');
    }

    const providerResult = await this.provider.createIntent({
      amount,
      currency,
      bookingId: dto.bookingId,
      idempotencyKey,
    });

    const commission = defaultCommission(amount);

    let payment;
    try {
      payment = await this.prisma.payment.create({
        data: {
          bookingId: dto.bookingId,
          amount: new Prisma.Decimal(amount),
          commission: new Prisma.Decimal(commission),
          currency,
          status: providerResult.status,
          provider: providerResult.provider,
          externalId: providerResult.externalId,
          idempotencyKey,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        if (idempotencyKey) {
          const again = await this.prisma.payment.findUnique({
            where: { idempotencyKey },
          });
          if (again) return this.mapPayment(again);
        }
        throw new ConflictException(
          'İdempotency açarı və ya sifariş ödənişi artıq mövcuddur',
        );
      }
      throw error;
    }

    const summary = this.mapPayment(payment);

    if (idempotencyKey) {
      try {
        await this.idempotency.save({
          key: idempotencyKey,
          userId,
          route,
          statusCode: 201,
          body: {
            ...summary,
            _requestHash: hashIdempotencyPayload({
              bookingId: dto.bookingId,
              amount: dto.amount,
              currency,
            }),
          },
        });
      } catch {
        // Conflict race — payment artıq yaradılıb; summary qaytar
      }
    }

    this.logger.debug(
      `Payment intent yaradıldı: ${payment.id} provider=${payment.provider}`,
    );
    this.metrics.incPaymentIntent();
    return summary;
  }

  async authorizeHold(
    userId: string,
    role: string,
    paymentId: string,
    dto: PaymentActionDto,
    headerIdempotencyKey?: string | null,
  ): Promise<PaymentSummary> {
    return this.runAction(
      userId,
      role,
      paymentId,
      'authorize',
      dto,
      headerIdempotencyKey,
    );
  }

  async capture(
    userId: string,
    role: string,
    paymentId: string,
    dto: PaymentActionDto,
    headerIdempotencyKey?: string | null,
  ): Promise<PaymentSummary> {
    return this.runAction(
      userId,
      role,
      paymentId,
      'capture',
      dto,
      headerIdempotencyKey,
    );
  }

  async refund(
    userId: string,
    role: string,
    paymentId: string,
    dto: PaymentActionDto,
    headerIdempotencyKey?: string | null,
  ): Promise<PaymentSummary> {
    return this.runAction(
      userId,
      role,
      paymentId,
      'refund',
      dto,
      headerIdempotencyKey,
    );
  }

  async findOne(
    userId: string,
    role: string,
    paymentId: string,
  ): Promise<PaymentSummary> {
    this.assertEnabled();
    const payment = await this.requirePayment(paymentId);
    await this.assertPaymentAccess(userId, role, payment.bookingId, 'read');
    return this.mapPayment(payment);
  }

  private async runAction(
    userId: string,
    role: string,
    paymentId: string,
    action: 'authorize' | 'capture' | 'refund',
    dto: PaymentActionDto,
    headerIdempotencyKey?: string | null,
  ): Promise<PaymentSummary> {
    this.assertEnabled();

    const idempotencyKey = normalizeIdempotencyKey(
      dto.idempotencyKey ?? headerIdempotencyKey,
    );
    const route = `POST /payments/${paymentId}/${action}`;
    const accessMode: PaymentAccessMode =
      action === 'refund' ? 'refund' : 'pay';

    if (idempotencyKey) {
      const cached = await this.idempotency.findExisting(
        idempotencyKey,
        userId,
        route,
      );
      if (cached.hit) {
        return this.stripInternal(cached.body as PaymentSummary & {
          _requestHash?: string;
        });
      }
    }

    const payment = await this.requirePayment(paymentId);
    await this.assertPaymentAccess(userId, role, payment.bookingId, accessMode);

    if (!payment.externalId) {
      throw new ConflictException('Ödəniş xarici ID-yə malik deyil');
    }

    let result;
    switch (action) {
      case 'authorize':
        if (payment.status !== PaymentStatus.REQUIRES_PAYMENT) {
          throw new ConflictException('Yalnız gözləyən ödəniş hold edilə bilər');
        }
        result = await this.provider.authorizeHold(payment.externalId);
        break;
      case 'capture':
        if (
          payment.status !== PaymentStatus.AUTHORIZED &&
          payment.status !== PaymentStatus.REQUIRES_PAYMENT
        ) {
          throw new ConflictException('Bu statusda capture mümkün deyil');
        }
        result = await this.provider.capture(payment.externalId);
        break;
      case 'refund':
        if (payment.status !== PaymentStatus.CAPTURED) {
          throw new ConflictException('Yalnız tutulmuş ödəniş geri qaytarıla bilər');
        }
        result = await this.provider.refund(payment.externalId);
        break;
    }

    const updated = await this.prisma.payment.update({
      where: { id: paymentId },
      data: { status: result.status },
    });

    const summary = this.mapPayment(updated);

    if (idempotencyKey) {
      try {
        await this.idempotency.save({
          key: idempotencyKey,
          userId,
          route,
          statusCode: 200,
          body: {
            ...summary,
            _requestHash: hashIdempotencyPayload({ paymentId, action }),
          },
        });
      } catch {
        // ignore race
      }
    }

    return summary;
  }

  private async requirePayment(id: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id } });
    if (!payment) {
      throw new NotFoundException('Ödəniş tapılmadı');
    }
    return payment;
  }

  /**
   * Orphan (bookingId=null) ödənişlər əlçatan deyil.
   * read: customer | provider | admin
   * pay: yalnız customer (sifariş sahibi)
   * refund: yalnız admin
   */
  private async assertPaymentAccess(
    userId: string,
    role: string,
    bookingId: string | null,
    mode: PaymentAccessMode,
  ): Promise<void> {
    if (!bookingId) {
      throw new NotFoundException('Ödəniş tapılmadı');
    }

    if (mode === 'refund') {
      if (role !== UserRole.ADMIN) {
        throw new ForbiddenException('Yalnız admin geri qaytara bilər');
      }
      return;
    }

    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: { customerId: true, providerId: true },
    });
    if (!booking) {
      throw new NotFoundException('Sifariş tapılmadı');
    }

    if (role === UserRole.ADMIN) {
      return;
    }

    if (mode === 'pay') {
      if (booking.customerId !== userId) {
        throw new ForbiddenException('Yalnız sifariş sahibi ödəniş edə bilər');
      }
      return;
    }

    if (booking.customerId !== userId && booking.providerId !== userId) {
      throw new NotFoundException('Ödəniş tapılmadı');
    }
  }

  private stripInternal(
    body: PaymentSummary & { _requestHash?: string },
  ): PaymentSummary {
    const { _requestHash: _, ...summary } = body;
    return summary;
  }

  private mapPayment(row: {
    id: string;
    bookingId: string | null;
    amount: Prisma.Decimal;
    commission: Prisma.Decimal;
    currency: string;
    status: string;
    provider: string;
    externalId: string | null;
    idempotencyKey: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): PaymentSummary {
    return {
      id: row.id,
      bookingId: row.bookingId,
      amount: Number(row.amount),
      commission: Number(row.commission),
      currency: row.currency,
      status: row.status,
      provider: row.provider,
      externalId: row.externalId,
      idempotencyKey: row.idempotencyKey,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
