import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createPushAdapter } from './push.adapters';
import { PushNotificationService } from './push.service';
import { PUSH_ADAPTER } from './push.types';

@Module({
  providers: [
    PushNotificationService,
    {
      provide: PUSH_ADAPTER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => createPushAdapter(config),
    },
  ],
  exports: [PushNotificationService],
})
export class PushModule {}
