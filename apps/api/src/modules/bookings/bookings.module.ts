import { Module, forwardRef } from '@nestjs/common';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { AvailabilityModule } from '../availability/availability.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { TrackingModule } from '../tracking/tracking.module';
import { DispatchModule } from '../dispatch/dispatch.module';
import { GeoModule } from '../geo/geo.module';
import { NotificationChannelsModule } from '../../common/notifications/notification-channels.module';
import { IdempotencyModule } from '../../common/idempotency/idempotency.module';
import { BookingCapacityModule } from '../../common/booking/booking-capacity.module';

@Module({
  imports: [
    AvailabilityModule,
    RealtimeModule,
    forwardRef(() => TrackingModule),
    NotificationChannelsModule,
    IdempotencyModule,
    forwardRef(() => DispatchModule),
    GeoModule,
    BookingCapacityModule,
  ],
  controllers: [BookingsController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}
