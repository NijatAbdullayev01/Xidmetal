import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommissionService } from './commission.service';

/**
 * Borc müddəti sweep — müddəti bitmiş borcları (debtDueAt <= now) bağlayır.
 * İdempotentdir: suspendAccount artıq bağlı hesabı təkrar bağlamır, ona görə
 * çox replica / təkrarlanan işləmə təhlükəsizdir.
 */
@Injectable()
export class CommissionSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CommissionSchedulerService.name);
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private config: ConfigService,
    private commission: CommissionService,
  ) {}

  onModuleInit(): void {
    // Boot-da qaçırılmış deadline-lar üçün qısa gecikməli ilk sweep
    setTimeout(() => void this.sweep(), 10_000);
    this.timer = setInterval(() => void this.sweep(), this.intervalMs());
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private intervalMs(): number {
    const raw = this.config.get<string>('COMMISSION_SWEEP_INTERVAL_MS')?.trim();
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed >= 60_000
      ? parsed
      : 60 * 60 * 1000;
  }

  private async sweep(): Promise<void> {
    try {
      const { suspended } = await this.commission.runSuspensionSweep();
      if (suspended > 0) {
        this.logger.log(`Borc müddəti bitdi — ${suspended} hesab bağlandı`);
      }
    } catch (error) {
      this.logger.warn(
        `Borc sweep uğursuz: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
