import { isPaymentsEnabled } from '../../modules/payments/payments-flag';

export type ProductionGuardEnv = {
  nodeEnv: string;
  jwtSecret?: string | null;
  mediaSigningSecret?: string | null;
  smtpHost?: string | null;
  turnstileSecret?: string | null;
  redisUrl?: string | null;
  metricsToken?: string | null;
  geocoderProvider?: string | null;
  paymentsEnabled?: string | null;
  paymentProvider?: string | null;
};

/**
 * Production boot fail-fast — zəif/əskik ops konfiq ilə “işləyən” deqradasiya yox.
 * Development-da heç nə etmir.
 */
export function assertProductionRuntimeConfig(env: ProductionGuardEnv): void {
  if (env.nodeEnv !== 'production') return;

  const missing: string[] = [];
  const jwtSecret = env.jwtSecret?.trim();
  const mediaSigningSecret = env.mediaSigningSecret?.trim();

  if (!mediaSigningSecret) {
    missing.push('MEDIA_SIGNING_SECRET (private media üçün ayrıca secret)');
  } else {
    if (mediaSigningSecret.length < 32) {
      missing.push('MEDIA_SIGNING_SECRET (ən azı 32 simvol olmalıdır)');
    }
    if (jwtSecret && mediaSigningSecret === jwtSecret) {
      missing.push('MEDIA_SIGNING_SECRET (JWT_SECRET ilə eyni olmamalıdır)');
    }
  }

  if (!env.smtpHost?.trim()) {
    missing.push('SMTP_HOST (verify/reset/contact e-poçt)');
  }
  if (!env.turnstileSecret?.trim()) {
    missing.push('TURNSTILE_SECRET_KEY (auth/contact captcha)');
  }
  if (!env.redisUrl?.trim()) {
    missing.push('REDIS_URL (ready/WS/dispatch/throttle)');
  }
  if (!env.metricsToken?.trim()) {
    missing.push('METRICS_TOKEN (/metrics Bearer)');
  }

  const geocoder = (env.geocoderProvider?.trim() || 'mock').toLowerCase();
  if (geocoder === 'mock') {
    missing.push('GEOCODER_PROVIDER (production-da mock qadağandır; nominatim və s.)');
  }

  if (isPaymentsEnabled(env.paymentsEnabled)) {
    missing.push(
      'PAYMENTS_ENABLED (production-da ödəniş scaffolding hələ hazır deyil — false saxlayın)',
    );
  }

  const paymentProvider = (env.paymentProvider?.trim() || 'noop').toLowerCase();
  if (paymentProvider === 'stripe') {
    missing.push(
      'PAYMENT_PROVIDER=stripe (real Stripe hələ yoxdur; production-da istifadə etməyin)',
    );
  }

  if (missing.length > 0) {
    throw new Error(
      `Production konfiq etibarsızdır:\n- ${missing.join('\n- ')}`,
    );
  }
}
