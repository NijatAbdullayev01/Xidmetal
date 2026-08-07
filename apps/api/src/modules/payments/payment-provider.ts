import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentStatus, PAYMENTS } from '@xidmetal/shared';

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
 * Stripe skeleton — real charge etmir.
 * Env placeholder: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
 */
@Injectable()
export class StripePaymentProvider implements PaymentProviderAdapter {
  readonly name = 'stripe';
  private readonly logger = new Logger(StripePaymentProvider.name);
  private readonly secretKey: string | null;

  constructor(private config: ConfigService) {
    this.secretKey = this.config.get<string>('STRIPE_SECRET_KEY')?.trim() || null;
  }

  async createIntent(params: CreateIntentParams): Promise<ProviderIntentResult> {
    this.logger.log(
      `[stripe stub] createIntent amount=${params.amount} (real charge deferred; key=${this.secretKey ? 'set' : 'missing'})`,
    );
    return {
      externalId: `stripe_pi_stub_${Date.now()}`,
      status: PaymentStatus.REQUIRES_PAYMENT,
      provider: this.name,
    };
  }

  async authorizeHold(externalId: string): Promise<ProviderIntentResult> {
    this.logger.log(`[stripe stub] authorizeHold ${externalId}`);
    return {
      externalId,
      status: PaymentStatus.AUTHORIZED,
      provider: this.name,
    };
  }

  async capture(externalId: string): Promise<ProviderIntentResult> {
    this.logger.log(`[stripe stub] capture ${externalId}`);
    return {
      externalId,
      status: PaymentStatus.CAPTURED,
      provider: this.name,
    };
  }

  async refund(externalId: string): Promise<ProviderIntentResult> {
    this.logger.log(`[stripe stub] refund ${externalId}`);
    return {
      externalId,
      status: PaymentStatus.REFUNDED,
      provider: this.name,
    };
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
