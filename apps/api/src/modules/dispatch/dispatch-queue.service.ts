import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker, type Job } from 'bullmq';
import { DISPATCH } from '@xidmetal/shared';
import IORedis from 'ioredis';

export const DISPATCH_SEARCH_WINDOW_JOB = 'search-window-end';
export const DISPATCH_REDISCOVERY_JOB = 'rediscovery';
export const DISPATCH_DECLINE_REOFFER_JOB = 'decline-reoffer';

export interface SearchWindowJobData {
  bookingId: string;
}

export interface RediscoveryJobData {
  bookingId: string;
}

export interface DeclineReofferJobData {
  bookingId: string;
  providerId: string;
}

type DispatchJobData =
  | SearchWindowJobData
  | RediscoveryJobData
  | DeclineReofferJobData;

/**
 * BullMQ: axtarış pəncərəsi sonu + rediscovery + imtina sonrası yenidən təklif.
 * Tək təklif timeout yoxdur — təkliflər pəncərə bitənə qədər qalır.
 * REDIS_URL yoxdursa: development-də in-process setTimeout; production-da degradasiya log.
 */
@Injectable()
export class DispatchQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DispatchQueueService.name);
  private queue: Queue<DispatchJobData> | null = null;
  private worker: Worker<DispatchJobData> | null = null;
  private connection: IORedis | null = null;
  private readonly fallbackTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private searchWindowHandler:
    | ((data: SearchWindowJobData) => Promise<void>)
    | null = null;
  private rediscoveryHandler:
    | ((data: RediscoveryJobData) => Promise<void>)
    | null = null;
  private declineReofferHandler:
    | ((data: DeclineReofferJobData) => Promise<void>)
    | null = null;

  constructor(private config: ConfigService) {}

  onModuleInit(): void {
    const redisUrl = this.config.get<string>('REDIS_URL')?.trim();
    if (!redisUrl) {
      const isProd = this.config.get<string>('NODE_ENV') === 'production';
      if (isProd) {
        this.logger.error(
          'REDIS_URL yoxdur — production-da BullMQ dispatch job-ları işləməyəcək. REDIS_URL təyin edin.',
        );
      } else {
        this.logger.warn(
          'REDIS_URL yoxdur — dispatch job-ları in-process setTimeout fallback (yalnız development)',
        );
      }
      return;
    }

    try {
      this.connection = new IORedis(redisUrl, {
        maxRetriesPerRequest: null,
        enableReadyCheck: true,
      });
      this.connection.on('error', (err) => {
        this.logger.warn(`Dispatch Redis: ${err.message}`);
      });

      const prefix =
        this.config.get<string>('DISPATCH_QUEUE_PREFIX')?.trim() ||
        DISPATCH.QUEUE_PREFIX;

      this.queue = new Queue<DispatchJobData>(DISPATCH.QUEUE_NAME, {
        connection: this.connection,
        prefix,
      });

      this.worker = new Worker<DispatchJobData>(
        DISPATCH.QUEUE_NAME,
        async (job: Job<DispatchJobData>) => {
          if (job.name === DISPATCH_SEARCH_WINDOW_JOB) {
            if (!this.searchWindowHandler) {
              this.logger.warn('Search-window handler hələ bağlı deyil');
              return;
            }
            await this.searchWindowHandler(job.data as SearchWindowJobData);
            return;
          }
          if (job.name === DISPATCH_REDISCOVERY_JOB) {
            if (!this.rediscoveryHandler) {
              this.logger.warn('Rediscovery handler hələ bağlı deyil');
              return;
            }
            await this.rediscoveryHandler(job.data as RediscoveryJobData);
            return;
          }
          if (job.name === DISPATCH_DECLINE_REOFFER_JOB) {
            if (!this.declineReofferHandler) {
              this.logger.warn('Decline-reoffer handler hələ bağlı deyil');
              return;
            }
            await this.declineReofferHandler(job.data as DeclineReofferJobData);
          }
        },
        { connection: this.connection.duplicate(), prefix },
      );

      this.worker.on('failed', (job, err) => {
        this.logger.warn(
          `Dispatch job uğursuz (${job?.id}): ${err.message}`,
        );
      });

      this.logger.log('BullMQ dispatch queue hazır');
    } catch (error) {
      this.logger.error(
        `BullMQ qoşulmadı: ${error instanceof Error ? error.message : String(error)}`,
      );
      this.queue = null;
      this.worker = null;
    }
  }

  async onModuleDestroy(): Promise<void> {
    for (const timer of this.fallbackTimers.values()) {
      clearTimeout(timer);
    }
    this.fallbackTimers.clear();
    await this.worker?.close();
    await this.queue?.close();
    this.connection?.disconnect();
  }

  setSearchWindowHandler(
    handler: ((data: SearchWindowJobData) => Promise<void>) | null,
  ): void {
    this.searchWindowHandler = handler;
  }

  setRediscoveryHandler(
    handler: ((data: RediscoveryJobData) => Promise<void>) | null,
  ): void {
    this.rediscoveryHandler = handler;
  }

  setDeclineReofferHandler(
    handler: ((data: DeclineReofferJobData) => Promise<void>) | null,
  ): void {
    this.declineReofferHandler = handler;
  }

  /** Booking axtarış pəncərəsi bitəndə failDispatch. */
  async scheduleSearchWindowEnd(
    data: SearchWindowJobData,
    delayMs: number,
  ): Promise<void> {
    // BullMQ custom jobId `:` qəbul etmir
    const jobId = `search-window-${data.bookingId}`;
    if (this.queue) {
      const existing = await this.queue.getJob(jobId);
      if (existing) {
        const state = await existing.getState();
        if (state === 'delayed' || state === 'waiting' || state === 'active') {
          return;
        }
        try {
          await existing.remove();
        } catch {
          /* ignore */
        }
      }
      await this.queue.add(DISPATCH_SEARCH_WINDOW_JOB, data, {
        jobId,
        delay: Math.max(0, delayMs),
        removeOnComplete: true,
        removeOnFail: 50,
      });
      return;
    }

    this.scheduleFallback(
      jobId,
      delayMs,
      () => this.searchWindowHandler?.(data),
      `Search-window schedule edilmədi (Redis yoxdur): ${data.bookingId}`,
    );
  }

  /**
   * Yeni ONLINE xidmət verənlər üçün yenidən axtarış.
   * Eyni booking üçün təkrar schedule — mövcud job saxlanılır.
   */
  async scheduleRediscovery(
    data: RediscoveryJobData,
    delayMs: number,
  ): Promise<void> {
    const jobId = `rediscovery-${data.bookingId}`;
    if (this.queue) {
      try {
        const existing = await this.queue.getJob(jobId);
        if (existing) {
          const state = await existing.getState();
          if (state === 'delayed' || state === 'waiting' || state === 'active') {
            return;
          }
          try {
            await existing.remove();
          } catch {
            /* ignore */
          }
        }
        await this.queue.add(DISPATCH_REDISCOVERY_JOB, data, {
          jobId,
          delay: Math.max(0, delayMs),
          removeOnComplete: true,
          removeOnFail: 50,
        });
        return;
      } catch (error) {
        this.logger.warn(
          `Rediscovery BullMQ uğursuz, local timer: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    if (this.fallbackTimers.has(jobId)) return;

    this.scheduleLocalTimer(jobId, delayMs, () =>
      this.rediscoveryHandler?.(data),
    );
  }

  /**
   * İmtina edən xidmət verənə cooldown sonra yenidən təklif.
   * İn-process timer — Redis/BullMQ worker asılılığı yox (əvvəlki uğursuzluğun səbəbi).
   * API restart olsa belə rediscovery cooldown bitəndən sonra ehtiyat kimi təklif göndərir.
   */
  async scheduleDeclineReoffer(
    data: DeclineReofferJobData,
    delayMs: number,
  ): Promise<void> {
    const jobId = `decline-reoffer-${data.bookingId}-${data.providerId}`;
    this.logger.log(
      `Decline-reoffer planlandı: booking=${data.bookingId} provider=${data.providerId} delay=${Math.round(delayMs / 1000)}s`,
    );
    this.scheduleLocalTimer(jobId, delayMs, () =>
      this.declineReofferHandler?.(data),
    );
  }

  async cancelSearchWindowEnd(bookingId: string): Promise<void> {
    const jobId = `search-window-${bookingId}`;
    await this.cancelFallback(jobId);

    if (!this.queue) return;
    try {
      const job = await this.queue.getJob(jobId);
      if (job) await job.remove();
    } catch (error) {
      this.logger.debug(
        `Search-window job silinmədi: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async cancelRediscovery(bookingId: string): Promise<void> {
    const jobId = `rediscovery-${bookingId}`;
    await this.cancelFallback(jobId);

    if (!this.queue) return;
    try {
      const job = await this.queue.getJob(jobId);
      if (job) await job.remove();
    } catch (error) {
      this.logger.debug(
        `Rediscovery job silinmədi: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async cancelDeclineReoffers(bookingId: string): Promise<void> {
    const prefix = `decline-reoffer-${bookingId}-`;
    await this.cancelFallbackByPrefix(prefix);

    if (!this.queue) return;
    try {
      const jobs = await this.queue.getJobs(['delayed', 'waiting', 'active']);
      for (const job of jobs) {
        const id = job.id;
        if (typeof id === 'string' && id.startsWith(prefix)) {
          try {
            await job.remove();
          } catch {
            /* ignore */
          }
        }
      }
    } catch (error) {
      this.logger.debug(
        `Decline-reoffer job-lar silinmədi: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private scheduleFallback(
    key: string,
    delayMs: number,
    run: (() => Promise<void> | undefined) | undefined,
    prodError: string,
  ): void {
    const isProd = this.config.get<string>('NODE_ENV') === 'production';
    if (isProd) {
      this.logger.error(prodError);
      return;
    }

    this.scheduleLocalTimer(key, delayMs, run);
  }

  /** Production-da da işləyən in-process timer (decline-reoffer üçün). */
  private scheduleLocalTimer(
    key: string,
    delayMs: number,
    run: (() => Promise<void> | undefined) | undefined,
  ): void {
    this.logger.log(`Local dispatch timer: key=${key} delay=${delayMs}ms`);
    const existing = this.fallbackTimers.get(key);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => {
      this.fallbackTimers.delete(key);
      void Promise.resolve(run?.()).catch((err) => {
        this.logger.warn(
          `Local timer xətası (${key}): ${err instanceof Error ? err.message : String(err)}`,
        );
      });
    }, Math.max(0, delayMs));
    this.fallbackTimers.set(key, timer);
  }

  private async cancelFallback(key: string): Promise<void> {
    const timer = this.fallbackTimers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.fallbackTimers.delete(key);
    }
  }

  private async cancelFallbackByPrefix(prefix: string): Promise<void> {
    for (const key of [...this.fallbackTimers.keys()]) {
      if (key.startsWith(prefix)) {
        await this.cancelFallback(key);
      }
    }
  }
}
