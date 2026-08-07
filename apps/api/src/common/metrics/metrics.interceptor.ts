import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable, catchError, throwError, tap } from 'rxjs';
import { MetricsService } from './metrics.service';
import {
  normalizeHttpRoute,
  shouldSkipHttpMetric,
} from './route-normalize';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();
    const started = process.hrtime.bigint();

    return next.handle().pipe(
      tap(() => {
        this.record(req, res.statusCode || 200, started);
      }),
      catchError((err: unknown) => {
        const status = resolveErrorStatus(err, res);
        this.record(req, status, started);
        return throwError(() => err);
      }),
    );
  }

  private record(req: Request, statusCode: number, started: bigint): void {
    const route = normalizeHttpRoute(req);
    if (shouldSkipHttpMetric(route)) return;

    const durationSeconds = Number(process.hrtime.bigint() - started) / 1e9;
    this.metrics.observeHttp({
      method: req.method || 'GET',
      route,
      statusCode,
      durationSeconds,
    });
  }
}

function resolveErrorStatus(err: unknown, res: Response): number {
  if (err instanceof HttpException) {
    return err.getStatus();
  }
  if (
    typeof err === 'object' &&
    err !== null &&
    'status' in err &&
    typeof (err as { status: unknown }).status === 'number'
  ) {
    return (err as { status: number }).status;
  }
  return res.statusCode >= 400 ? res.statusCode : 500;
}
