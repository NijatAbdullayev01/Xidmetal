import { Module, forwardRef } from '@nestjs/common';
import { RealtimeModule } from '../realtime/realtime.module';
import { NotificationChannelsModule } from '../../common/notifications/notification-channels.module';
import { DispatchController } from './dispatch.controller';
import { DispatchService } from './dispatch.service';
import { DispatchQueueService } from './dispatch-queue.service';

@Module({
  imports: [forwardRef(() => RealtimeModule), NotificationChannelsModule],
  controllers: [DispatchController],
  providers: [DispatchService, DispatchQueueService],
  exports: [DispatchService],
})
export class DispatchModule {}
