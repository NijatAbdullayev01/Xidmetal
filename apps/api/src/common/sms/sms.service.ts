import { Inject, Injectable, Logger } from '@nestjs/common';
import { SMS_ADAPTER, type SmsAdapter, type SmsMessage } from './sms.types';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(@Inject(SMS_ADAPTER) private adapter: SmsAdapter) {}

  get adapterName(): string {
    return this.adapter.name;
  }

  async send(message: SmsMessage): Promise<void> {
    try {
      await this.adapter.send(message);
    } catch (error) {
      this.logger.warn(
        `SMS uğursuz: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
