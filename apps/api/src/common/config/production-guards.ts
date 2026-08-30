import { isTurnstileDummySecret, isTurnstileDummySiteKey } from '@xidmetal/shared';
import { isLoopbackSmtpHost, normalizeSmtpHost } from '../mail/smtp-host';
import { isPaymentsEnabled } from '../../modules/payments/payments-flag';

export type ProductionGuardEnv = {
  nodeEnv: string;
  jwtSecret?: string | null;
  mediaSigningSecret?: string | null;
  smtpHost?: string | null;
  turnstileSecret?: string | null;
  turnstileSiteKey?: string | null;
  redisUrl?: string | null;
  metricsToken?: string | null;
  geocoderProvider?: string | null;
  paymentsEnabled?: string | null;
  paymentProvider?: string | null;
  databaseUrl?: string | null;
};

const WEAK_DB_FRAGMENTS = ['xidmetal_dev', ':xidmetal@'] as const;
const WEAK_REDIS_PASSWORDS = ['xidmetal_dev', 'changeme', 'change-me'] as const;

export function databaseUrlLooksWeak(url: string): boolean {
  const lower = url.toLowerCase();
  return WEAK_DB_FRAGMENTS.some((fragment) => lower.includes(fragment));
}

export function redisUrlHasPassword(url: string): boolean {
  try {
    const parsed = new URL(url);
    return Boolean(parsed.password);
  } catch {
    return false;
  }
}

function redisPasswordLooksWeak(url: string): boolean {
  try {
    const parsed = new URL(url);
    const password = decodeURIComponent(parsed.password || '').toLowerCase();
    if (!password) return true;
    return WEAK_REDIS_PASSWORDS.some((fragment) => password.includes(fragment));
  } catch {
    return true;
  }
}

/**
 * Production boot fail-fast — zəif secret/parol və dummy Turnstile ilə “işləyən”
 * deqradasiya yox. Boş Turnstile captcha skip-dir (Bootstrap warning).
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

  const smtpHost = normalizeSmtpHost(env.smtpHost);
  if (!smtpHost) {
    missing.push('SMTP_HOST (verify/reset/contact e-poçt)');
  } else if (isLoopbackSmtpHost(smtpHost)) {
    missing.push(
      'SMTP_HOST (localhost/127.0.0.1 production-da e-poçt göndərmir — real SMTP provider)',
    );
  }
  // Boş = captcha skip (CaptchaService). Dummy/test açar «var kimi» görünür, amma qorumur.
  if (isTurnstileDummySecret(env.turnstileSecret)) {
    missing.push(
      'TURNSTILE_SECRET_KEY (Cloudflare dummy/test açarı production-da qadağandır)',
    );
  }
  if (env.turnstileSiteKey && isTurnstileDummySiteKey(env.turnstileSiteKey)) {
    missing.push(
      'TURNSTILE_SITE_KEY (Cloudflare dummy/test site key production-da qadağandır)',
    );
  }
  if (!env.redisUrl?.trim()) {
    missing.push('REDIS_URL (ready/WS/dispatch/throttle)');
  } else if (!redisUrlHasPassword(env.redisUrl) || redisPasswordLooksWeak(env.redisUrl)) {
    missing.push(
      'REDIS_URL (production-da Redis AUTH parolu məcburidir; zəif/placeholder olmamalıdır)',
    );
  }
  if (!env.metricsToken?.trim()) {
    missing.push('METRICS_TOKEN (/metrics Bearer)');
  }

  const databaseUrl = env.databaseUrl?.trim();
  if (databaseUrl && databaseUrlLooksWeak(databaseUrl)) {
    missing.push(
      'DATABASE_URL (production-da xidmetal_dev / default parol qadağandır)',
    );
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
