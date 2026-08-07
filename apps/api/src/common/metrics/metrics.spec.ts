import { describe, expect, it } from 'vitest';
import { MetricsService } from './metrics.service';

describe('MetricsService', () => {
  it('Prometheus text + content-type və sample metrikalar verir', async () => {
    const metrics = new MetricsService();
    metrics.ensureInitialized();

    metrics.incBookingCreated('SCHEDULED');
    metrics.incDispatchOffer('created');
    metrics.incPaymentIntent();
    metrics.incWsConnection();
    metrics.observeHttp({
      method: 'GET',
      route: '/api/v1/categories',
      statusCode: 200,
      durationSeconds: 0.012,
    });

    const text = await metrics.getMetricsText();
    const contentType = metrics.contentType;

    expect(contentType).toMatch(/text\/plain/);
    expect(contentType).toMatch(/openmetrics|version|charset|utf/i);

    expect(text).toContain('xidmetal_bookings_created_total');
    expect(text).toContain('type="SCHEDULED"');
    expect(text).toContain('xidmetal_dispatch_offers_total');
    expect(text).toContain('result="created"');
    expect(text).toContain('xidmetal_payments_intents_total');
    expect(text).toContain('xidmetal_ws_connections');
    expect(text).toContain('xidmetal_http_requests_total');
    expect(text).toContain('xidmetal_process_');
  });

  it('METRICS_TOKEN boş olanda controller açıq qalır (unit: service yalnız)', async () => {
    const metrics = new MetricsService();
    const body = await metrics.getMetricsText();
    expect(body.length).toBeGreaterThan(0);
  });
});

describe('MetricsController auth', () => {
  it('token təyin olunubsa Bearer uyğun olmalıdır', async () => {
    const { MetricsController } = await import('./metrics.controller');
    const metrics = new MetricsService();
    const config = {
      get: (key: string) => (key === 'METRICS_TOKEN' ? 'secret-token' : undefined),
    };
    const controller = new MetricsController(metrics, config as never);

    const res = { setHeader: () => undefined };
    await expect(controller.scrape(res as never, undefined)).rejects.toThrow(
      /token|Metrics/i,
    );
    await expect(
      controller.scrape(res as never, 'Bearer wrong'),
    ).rejects.toThrow(/token|Metrics/i);

    const body = await controller.scrape(res as never, 'Bearer secret-token');
    expect(body).toContain('xidmetal_');
  });

  it('token yoxdursa development-də scrape açıqdır', async () => {
    const { MetricsController } = await import('./metrics.controller');
    const metrics = new MetricsService();
    const config = {
      get: (key: string) => (key === 'NODE_ENV' ? 'development' : undefined),
    };
    const controller = new MetricsController(metrics, config as never);
    const res = { setHeader: () => undefined };
    const body = await controller.scrape(res as never);
    expect(body).toContain('xidmetal_');
  });

  it('production-da token yoxdursa scrape rədd edilir', async () => {
    const { MetricsController } = await import('./metrics.controller');
    const metrics = new MetricsService();
    const config = {
      get: (key: string) => (key === 'NODE_ENV' ? 'production' : undefined),
    };
    const controller = new MetricsController(metrics, config as never);
    const res = { setHeader: () => undefined };
    await expect(controller.scrape(res as never)).rejects.toThrow(
      /METRICS_TOKEN|Metrics/i,
    );
  });
});
