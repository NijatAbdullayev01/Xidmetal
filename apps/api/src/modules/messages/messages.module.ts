import { Module } from '@nestjs/common';
import { NotificationChannelsModule } from '../../common/notifications/notification-channels.module';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [NotificationsModule, RealtimeModule, NotificationChannelsModule],
  controllers: [MessagesController],
  providers: [MessagesService],
})
export class MessagesModule {}
