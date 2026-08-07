import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createSmsAdapter } from './sms.adapters';
import { SmsService } from './sms.service';
import { SMS_ADAPTER } from './sms.types';

@Module({
  providers: [
    SmsService,
    {
      provide: SMS_ADAPTER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => createSmsAdapter(config),
    },
  ],
  exports: [SmsService],
})
export class SmsModule {}
