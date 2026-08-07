import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker, type Job } from 'bullmq';
import { DISPATCH } from '@xidmetal/shared';
import IORedis from 'ioredis';

export const DISPATCH_OFFER_TIMEOUT_JOB = 'offer-timeout';

export interface OfferTimeoutJobData {
  offerId: string;
  bookingId: string;
}

/**
 * BullMQ offer timeout queue.
 * REDIS_URL yoxdursa: development-də in-process setTimeout; production-da degradasiya log.
 */
@Injectable()
export class DispatchQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DispatchQueueService.name);
  private queue: Queue<OfferTimeoutJobData> | null = null;
  private worker: Worker<OfferTimeoutJobData> | null = null;
  private connection: IORedis | null = null;
  private readonly fallbackTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private timeoutHandler: ((data: OfferTimeoutJobData) => Promise<void>) | null =
    null;

  constructor(private config: ConfigService) {}

  onModuleInit(): void {
    const redisUrl = this.config.get<string>('REDIS_URL')?.trim();
    if (!redisUrl) {
      const isProd = this.config.get<string>('NODE_ENV') === 'production';
      if (isProd) {
        this.logger.error(
          'REDIS_URL yoxdur — production-da BullMQ dispatch timeout işləməyəcək. REDIS_URL təyin edin.',
        );
      } else {
        this.logger.warn(
          'REDIS_URL yoxdur — dispatch timeout in-process setTimeout fallback (yalnız development)',
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

      this.queue = new Queue<OfferTimeoutJobData>(DISPATCH.QUEUE_NAME, {
        connection: this.connection,
        prefix,
      });

      this.worker = new Worker<OfferTimeoutJobData>(
        DISPATCH.QUEUE_NAME,
        async (job: Job<OfferTimeoutJobData>) => {
          if (job.name !== DISPATCH_OFFER_TIMEOUT_JOB) return;
          if (!this.timeoutHandler) {
            this.logger.warn('Offer timeout handler hələ bağlı deyil');
            return;
          }
          await this.timeoutHandler(job.data);
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

  setTimeoutHandler(
    handler: (data: OfferTimeoutJobData) => Promise<void>,
  ): void {
    this.timeoutHandler = handler;
  }

  /**
   * Offer timeout job — delayMs sonra `handleOfferTimeout` çağırılır.
   */
  async scheduleOfferTimeout(
    data: OfferTimeoutJobData,
    delayMs: number,
  ): Promise<void> {
    if (this.queue) {
      await this.queue.add(DISPATCH_OFFER_TIMEOUT_JOB, data, {
        jobId: `offer-timeout:${data.offerId}`,
        delay: Math.max(0, delayMs),
        removeOnComplete: true,
        removeOnFail: 50,
      });
      return;
    }

    const isProd = this.config.get<string>('NODE_ENV') === 'production';
    if (isProd) {
      this.logger.error(
        `Offer timeout schedule edilmədi (Redis yoxdur): ${data.offerId}`,
      );
      return;
    }

    this.logger.debug(
      `In-process timeout fallback: offer=${data.offerId} delay=${delayMs}ms`,
    );
    const existing = this.fallbackTimers.get(data.offerId);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => {
      this.fallbackTimers.delete(data.offerId);
      void this.timeoutHandler?.(data).catch((err) => {
        this.logger.warn(
          `Fallback timeout xətası: ${err instanceof Error ? err.message : String(err)}`,
        );
      });
    }, Math.max(0, delayMs));
    this.fallbackTimers.set(data.offerId, timer);
  }

  async cancelOfferTimeout(offerId: string): Promise<void> {
    const timer = this.fallbackTimers.get(offerId);
    if (timer) {
      clearTimeout(timer);
      this.fallbackTimers.delete(offerId);
    }

    if (!this.queue) return;
    try {
      const job = await this.queue.getJob(`offer-timeout:${offerId}`);
      if (job) await job.remove();
    } catch (error) {
      this.logger.debug(
        `Timeout job silinmədi: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
