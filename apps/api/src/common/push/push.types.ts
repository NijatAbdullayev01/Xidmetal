export interface PushMessage {
  title: string;
  body: string;
  data?: Record<string, string>;
}

export interface PushAdapter {
  readonly name: string;
  send(token: string, message: PushMessage): Promise<void>;
}

export const PUSH_ADAPTER = Symbol('PUSH_ADAPTER');
