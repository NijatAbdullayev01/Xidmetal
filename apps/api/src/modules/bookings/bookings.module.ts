import { Module, forwardRef } from '@nestjs/common';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { AvailabilityModule } from '../availability/availability.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { DispatchModule } from '../dispatch/dispatch.module';
import { NotificationChannelsModule } from '../../common/notifications/notification-channels.module';
import { IdempotencyModule } from '../../common/idempotency/idempotency.module';

@Module({
  imports: [
    AvailabilityModule,
    RealtimeModule,
    NotificationChannelsModule,
    IdempotencyModule,
    forwardRef(() => DispatchModule),
  ],
  controllers: [BookingsController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}
