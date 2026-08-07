import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { SmsAdapter, SmsMessage } from './sms.types';

@Injectable()
export class NoopSmsAdapter implements SmsAdapter {
  readonly name = 'noop';
  private readonly logger = new Logger(NoopSmsAdapter.name);

  async send(message: SmsMessage): Promise<void> {
    this.logger.debug(`[noop sms] to=${message.to} len=${message.body.length}`);
  }
}

@Injectable()
export class ConsoleSmsAdapter implements SmsAdapter {
  readonly name = 'console';
  private readonly logger = new Logger(ConsoleSmsAdapter.name);

  async send(message: SmsMessage): Promise<void> {
    this.logger.log(`[SMS] → ${message.to}: ${message.body}`);
  }
}

/**
 * Twilio Messages API — credentials olduqda real HTTP göndərir.
 * Env: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER
 */
@Injectable()
export class TwilioSmsAdapter implements SmsAdapter {
  readonly name = 'twilio';
  private readonly logger = new Logger(TwilioSmsAdapter.name);
  private readonly accountSid: string | null;
  private readonly authToken: string | null;
  private readonly from: string | null;

  constructor(private config: ConfigService) {
    this.accountSid = this.config.get<string>('TWILIO_ACCOUNT_SID')?.trim() || null;
    this.authToken = this.config.get<string>('TWILIO_AUTH_TOKEN')?.trim() || null;
    this.from = this.config.get<string>('TWILIO_FROM_NUMBER')?.trim() || null;
  }

  get isConfigured(): boolean {
    return Boolean(this.accountSid && this.authToken && this.from);
  }

  async send(message: SmsMessage): Promise<void> {
    if (!this.isConfigured) {
      this.logger.debug(
        `[twilio unconfigured] to=${message.to} (real send skipped)`,
      );
      return;
    }

    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
    const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString(
      'base64',
    );

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: message.to,
        From: this.from!,
        Body: message.body,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(
        `Twilio SMS uğursuz (${res.status}): ${text.slice(0, 200)}`,
      );
    }

    this.logger.debug(`[twilio] sent to=${message.to}`);
  }
}

export function createSmsAdapter(config: ConfigService): SmsAdapter {
  const provider = (config.get<string>('SMS_PROVIDER')?.trim() || 'noop').toLowerCase();

  switch (provider) {
    case 'console':
      return new ConsoleSmsAdapter();
    case 'twilio':
      return new TwilioSmsAdapter(config);
    case 'noop':
    default:
      return new NoopSmsAdapter();
  }
}
