import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { PushAdapter, PushMessage } from './push.types';
import { sendFcmHttpV1, sendFcmLegacy } from './fcm-send';

@Injectable()
export class NoopPushAdapter implements PushAdapter {
  readonly name = 'noop';
  private readonly logger = new Logger(NoopPushAdapter.name);

  async send(token: string, message: PushMessage): Promise<void> {
    this.logger.debug(
      `[noop push] token=${token.slice(0, 12)}… title=${message.title}`,
    );
  }
}

/**
 * FCM — credentials olduqda real HTTP göndərir.
 * Env: FCM_PROJECT_ID + GOOGLE_APPLICATION_CREDENTIALS (v1)
 * və ya FCM_SERVER_KEY (legacy).
 */
@Injectable()
export class FcmPushAdapter implements PushAdapter {
  readonly name = 'fcm';
  private readonly logger = new Logger(FcmPushAdapter.name);
  private readonly projectId: string | null;
  private readonly serverKey: string | null;
  private readonly credentialsPath: string | null;

  constructor(private config: ConfigService) {
    this.projectId = this.config.get<string>('FCM_PROJECT_ID')?.trim() || null;
    this.serverKey = this.config.get<string>('FCM_SERVER_KEY')?.trim() || null;
    this.credentialsPath =
      this.config.get<string>('GOOGLE_APPLICATION_CREDENTIALS')?.trim() || null;
  }

  get isConfigured(): boolean {
    return Boolean(
      (this.projectId && this.credentialsPath) || this.serverKey,
    );
  }

  async send(token: string, message: PushMessage): Promise<void> {
    if (!this.isConfigured) {
      this.logger.debug(
        `[fcm unconfigured] token=${token.slice(0, 12)}… title=${message.title}`,
      );
      return;
    }

    const data =
      message.data &&
      Object.fromEntries(
        Object.entries(message.data).map(([k, v]) => [k, String(v)]),
      );

    const result =
      this.projectId && this.credentialsPath
        ? await sendFcmHttpV1({
            projectId: this.projectId,
            credentialsPath: this.credentialsPath,
            token,
            title: message.title,
            body: message.body,
            data,
          })
        : await sendFcmLegacy({
            serverKey: this.serverKey!,
            token,
            title: message.title,
            body: message.body,
            data,
          });

    if (!result.ok) {
      const err = new Error(
        `FCM send failed: ${result.errorCode ?? result.status ?? 'unknown'}`,
      );
      (err as Error & { fcmErrorCode?: string }).fcmErrorCode = result.errorCode;
      throw err;
    }
  }
}

export function createPushAdapter(config: ConfigService): PushAdapter {
  const projectId = config.get<string>('FCM_PROJECT_ID')?.trim();
  const serverKey = config.get<string>('FCM_SERVER_KEY')?.trim();
  const creds = config.get<string>('GOOGLE_APPLICATION_CREDENTIALS')?.trim();

  if ((projectId && creds) || serverKey) {
    return new FcmPushAdapter(config);
  }
  return new NoopPushAdapter();
}
