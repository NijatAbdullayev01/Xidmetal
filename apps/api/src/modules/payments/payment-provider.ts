import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentStatus, PAYMENTS } from '@xidmetal/shared';

const STRIPE_STUB_MESSAGE =
  'Stripe ödəniş inteqrasiyası hələ hazır deyil — real charge yoxdur';

export interface CreateIntentParams {
  amount: number;
  currency: string;
  bookingId?: string | null;
  idempotencyKey?: string | null;
  metadata?: Record<string, string>;
}

export interface ProviderIntentResult {
  externalId: string;
  status: PaymentStatus;
  provider: string;
}

export interface PaymentProviderAdapter {
  readonly name: string;
  createIntent(params: CreateIntentParams): Promise<ProviderIntentResult>;
  authorizeHold(externalId: string): Promise<ProviderIntentResult>;
  capture(externalId: string): Promise<ProviderIntentResult>;
  refund(externalId: string): Promise<ProviderIntentResult>;
}

export const PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER');

/** Default — heç bir real charge yoxdur */
@Injectable()
export class NoopPaymentProvider implements PaymentProviderAdapter {
  readonly name = 'noop';
  private readonly logger = new Logger(NoopPaymentProvider.name);

  async createIntent(params: CreateIntentParams): Promise<ProviderIntentResult> {
    const externalId = `noop_${Date.now()}`;
    this.logger.debug(
      `[noop] createIntent amount=${params.amount} ${params.currency}`,
    );
    return {
      externalId,
      status: PaymentStatus.REQUIRES_PAYMENT,
      provider: this.name,
    };
  }

  async authorizeHold(externalId: string): Promise<ProviderIntentResult> {
    this.logger.debug(`[noop] authorizeHold ${externalId}`);
    return {
      externalId,
      status: PaymentStatus.AUTHORIZED,
      provider: this.name,
    };
  }

  async capture(externalId: string): Promise<ProviderIntentResult> {
    this.logger.debug(`[noop] capture ${externalId}`);
    return {
      externalId,
      status: PaymentStatus.CAPTURED,
      provider: this.name,
    };
  }

  async refund(externalId: string): Promise<ProviderIntentResult> {
    this.logger.debug(`[noop] refund ${externalId}`);
    return {
      externalId,
      status: PaymentStatus.REFUNDED,
      provider: this.name,
    };
  }
}

/**
 * Stripe skeleton — real charge / webhook yoxdur.
 * Bütün əməliyyatlar 501: saxta CAPTURED status yaratmağa yol vermir.
 * Env placeholder (gələcək): STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
 */
@Injectable()
export class StripePaymentProvider implements PaymentProviderAdapter {
  readonly name = 'stripe';
  private readonly logger = new Logger(StripePaymentProvider.name);

  constructor(private config: ConfigService) {
    const key = this.config.get<string>('STRIPE_SECRET_KEY')?.trim();
    this.logger.warn(
      `[stripe stub] aktivdir amma real charge yoxdur (key=${key ? 'set' : 'missing'})`,
    );
  }

  private reject(): never {
    throw new HttpException(STRIPE_STUB_MESSAGE, HttpStatus.NOT_IMPLEMENTED);
  }

  async createIntent(_params: CreateIntentParams): Promise<ProviderIntentResult> {
    this.reject();
  }

  async authorizeHold(_externalId: string): Promise<ProviderIntentResult> {
    this.reject();
  }

  async capture(_externalId: string): Promise<ProviderIntentResult> {
    this.reject();
  }

  async refund(_externalId: string): Promise<ProviderIntentResult> {
    this.reject();
  }
}

export function createPaymentProvider(
  config: ConfigService,
): PaymentProviderAdapter {
  const name = (
    config.get<string>('PAYMENT_PROVIDER')?.trim() || 'noop'
  ).toLowerCase();

  if (name === 'stripe') {
    return new StripePaymentProvider(config);
  }
  return new NoopPaymentProvider();
}

export function defaultCommission(amount: number): number {
  return Number((amount * PAYMENTS.DEFAULT_COMMISSION_RATE).toFixed(2));
}
