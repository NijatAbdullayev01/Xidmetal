import { describe, expect, it } from 'vitest';
import { assertProductionRuntimeConfig } from './production-guards';

describe('assertProductionRuntimeConfig', () => {
  const valid = {
    nodeEnv: 'production',
    jwtSecret: 'jwt-secret-jwt-secret-jwt-secret-1234',
    mediaSigningSecret: 'media-secret-media-secret-media-1234',
    smtpHost: 'smtp.example.com',
    turnstileSecret: 'turnstile-secret',
    redisUrl: 'redis://localhost:6379',
    metricsToken: 'metrics-secret',
    geocoderProvider: 'nominatim',
    paymentsEnabled: 'false',
    paymentProvider: 'noop',
  };

  it('development-da heç nə etmir', () => {
    expect(() =>
      assertProductionRuntimeConfig({
        nodeEnv: 'development',
        jwtSecret: '',
        mediaSigningSecret: '',
        smtpHost: '',
        turnstileSecret: '',
        redisUrl: '',
        metricsToken: '',
        geocoderProvider: 'mock',
        paymentsEnabled: 'true',
        paymentProvider: 'stripe',
      }),
    ).not.toThrow();
  });

  it('tam konfiq ilə keçir', () => {
    expect(() => assertProductionRuntimeConfig(valid)).not.toThrow();
  });

  it('əskik SMTP/Turnstile/Redis/Metrics fail edir', () => {
    expect(() =>
      assertProductionRuntimeConfig({
        ...valid,
        smtpHost: '',
        turnstileSecret: null,
        redisUrl: '  ',
        metricsToken: undefined,
      }),
    ).toThrow(/SMTP_HOST|TURNSTILE|REDIS_URL|METRICS_TOKEN/);
  });

  it('loopback SMTP_HOST production-da qadağandır', () => {
    expect(() =>
      assertProductionRuntimeConfig({
        ...valid,
        smtpHost: 'localhost',
      }),
    ).toThrow(/SMTP_HOST/);
  });

  it('MEDIA_SIGNING_SECRET əskikdirsə fail edir', () => {
    expect(() =>
      assertProductionRuntimeConfig({
        ...valid,
        mediaSigningSecret: '',
      }),
    ).toThrow(/MEDIA_SIGNING_SECRET/);
  });

  it('MEDIA_SIGNING_SECRET JWT_SECRET ilə eyni ola bilməz', () => {
    expect(() =>
      assertProductionRuntimeConfig({
        ...valid,
        mediaSigningSecret: valid.jwtSecret,
      }),
    ).toThrow(/MEDIA_SIGNING_SECRET/);
  });

  it('mock geocoder production-da qadağandır', () => {
    expect(() =>
      assertProductionRuntimeConfig({
        ...valid,
        geocoderProvider: 'mock',
      }),
    ).toThrow(/GEOCODER_PROVIDER/);
  });

  it('PAYMENTS_ENABLED=true production-da qadağandır', () => {
    expect(() =>
      assertProductionRuntimeConfig({
        ...valid,
        paymentsEnabled: 'true',
      }),
    ).toThrow(/PAYMENTS_ENABLED/);
  });

  it('Cloudflare dummy Turnstile secret boot-u dayandırmır (captcha skip)', () => {
    expect(() =>
      assertProductionRuntimeConfig({
        ...valid,
        turnstileSecret: '1x0000000000000000000000000000000AA',
      }),
    ).not.toThrow();
  });

  it('PAYMENT_PROVIDER=stripe production-da qadağandır', () => {
    expect(() =>
      assertProductionRuntimeConfig({
        ...valid,
        paymentProvider: 'stripe',
      }),
    ).toThrow(/PAYMENT_PROVIDER/);
  });
});
