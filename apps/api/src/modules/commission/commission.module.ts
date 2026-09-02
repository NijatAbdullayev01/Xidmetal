import { Module } from '@nestjs/common';
import { IdempotencyModule } from '../../common/idempotency/idempotency.module';
import { NotificationChannelsModule } from '../../common/notifications/notification-channels.module';
import { CommissionController } from './commission.controller';
import { CommissionSchedulerService } from './commission-scheduler.service';
import { CommissionService } from './commission.service';
import { EpointService } from './epoint.service';

@Module({
  imports: [IdempotencyModule, NotificationChannelsModule],
  controllers: [CommissionController],
  providers: [CommissionService, EpointService, CommissionSchedulerService],
  exports: [CommissionService],
})
export class CommissionModule {}
