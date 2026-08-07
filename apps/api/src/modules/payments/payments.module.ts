import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IdempotencyModule } from '../../common/idempotency/idempotency.module';
import {
  createPaymentProvider,
  PAYMENT_PROVIDER,
} from './payment-provider';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [IdempotencyModule],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    {
      provide: PAYMENT_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => createPaymentProvider(config),
    },
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
