import { Module, forwardRef } from '@nestjs/common';
import { RealtimeModule } from '../realtime/realtime.module';
import { NotificationChannelsModule } from '../../common/notifications/notification-channels.module';
import { DispatchController } from './dispatch.controller';
import { DispatchService } from './dispatch.service';
import { DispatchQueueService } from './dispatch-queue.service';
import { BookingCapacityModule } from '../../common/booking/booking-capacity.module';

@Module({
  imports: [
    forwardRef(() => RealtimeModule),
    NotificationChannelsModule,
    BookingCapacityModule,
  ],
  controllers: [DispatchController],
  providers: [DispatchService, DispatchQueueService],
  exports: [DispatchService],
})
export class DispatchModule {}
