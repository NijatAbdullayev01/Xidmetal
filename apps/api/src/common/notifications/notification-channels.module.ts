import { Module, forwardRef } from '@nestjs/common';
import { PushModule } from '../push/push.module';
import { SmsModule } from '../sms/sms.module';
import { RealtimeModule } from '../../modules/realtime/realtime.module';
import { NotificationChannelsService } from './notification-channels.service';

@Module({
  imports: [PushModule, SmsModule, forwardRef(() => RealtimeModule)],
  providers: [NotificationChannelsService],
  exports: [NotificationChannelsService],
})
export class NotificationChannelsModule {}
