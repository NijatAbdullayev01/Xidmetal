import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  Counter,
  Gauge,
  Histogram,
  Registry,
  collectDefaultMetrics,
} from 'prom-client';

export type BookingCreatedType = 'INSTANT' | 'SCHEDULED';

export type DispatchOfferResult =
  | 'created'
  | 'accepted'
  | 'rejected'
  | 'expired'
  | 'cancelled';

@Injectable()
export class MetricsService implements OnModuleInit {
  readonly registry = new Registry();

  private httpRequestsTotal!: Counter<'method' | 'route' | 'status'>;
  private httpRequestDuration!: Histogram<'method' | 'route' | 'status'>;
  private bookingsCreatedTotal!: Counter<'type'>;
  private dispatchOffersTotal!: Counter<'result'>;
  private wsConnections!: Gauge;
  private paymentsIntentsTotal!: Counter;

  private defaultsRegistered = false;

  onModuleInit(): void {
    this.ensureInitialized();
  }

  /** Test və lazy boot üçün — default + custom metrikaları bir dəfə qeyd et */
  ensureInitialized(): void {
    if (this.defaultsRegistered) return;
    this.defaultsRegistered = true;

    collectDefaultMetrics({
      register: this.registry,
      prefix: 'xidmetal_',
    });

    this.httpRequestsTotal = new Counter({
      name: 'xidmetal_http_requests_total',
      help: 'HTTP sorğu sayı (method/route/status)',
      labelNames: ['method', 'route', 'status'] as const,
      registers: [this.registry],
    });

    this.httpRequestDuration = new Histogram({
      name: 'xidmetal_http_request_duration_seconds',
      help: 'HTTP sorğu müddəti (saniyə)',
      labelNames: ['method', 'route', 'status'] as const,
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [this.registry],
    });

    this.bookingsCreatedTotal = new Counter({
      name: 'xidmetal_bookings_created_total',
      help: 'Yaradılan sifarişlər (type)',
      labelNames: ['type'] as const,
      registers: [this.registry],
    });

    this.dispatchOffersTotal = new Counter({
      name: 'xidmetal_dispatch_offers_total',
      help: 'Dispatch təklif nəticələri',
      labelNames: ['result'] as const,
      registers: [this.registry],
    });

    this.wsConnections = new Gauge({
      name: 'xidmetal_ws_connections',
      help: 'Aktiv autentifikasiyalı Socket.IO bağlantıları',
      registers: [this.registry],
    });

    this.paymentsIntentsTotal = new Counter({
      name: 'xidmetal_payments_intents_total',
      help: 'Yaradılan payment intent sayı (flag OFF olsa 0 qalır)',
      registers: [this.registry],
    });
  }

  get contentType(): string {
    return this.registry.contentType;
  }

  async getMetricsText(): Promise<string> {
    this.ensureInitialized();
    return this.registry.metrics();
  }

  observeHttp(params: {
    method: string;
    route: string;
    statusCode: number;
    durationSeconds: number;
  }): void {
    this.ensureInitialized();
    const method = params.method.toUpperCase();
    const status = String(params.statusCode);
    const labels = { method, route: params.route, status };
    this.httpRequestsTotal.inc(labels);
    this.httpRequestDuration.observe(labels, params.durationSeconds);
  }

  incBookingCreated(type: BookingCreatedType): void {
    this.ensureInitialized();
    this.bookingsCreatedTotal.inc({ type });
  }

  incDispatchOffer(result: DispatchOfferResult): void {
    this.ensureInitialized();
    this.dispatchOffersTotal.inc({ result });
  }

  incWsConnection(): void {
    this.ensureInitialized();
    this.wsConnections.inc();
  }

  decWsConnection(): void {
    this.ensureInitialized();
    this.wsConnections.dec();
  }

  incPaymentIntent(): void {
    this.ensureInitialized();
    this.paymentsIntentsTotal.inc();
  }
}
