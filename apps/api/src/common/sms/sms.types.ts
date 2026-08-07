export interface SmsMessage {
  to: string;
  body: string;
}

export interface SmsAdapter {
  readonly name: string;
  send(message: SmsMessage): Promise<void>;
}

export const SMS_ADAPTER = Symbol('SMS_ADAPTER');
