import { Injectable, Logger, Optional } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { NotificationType } from '@xidmetal/shared';
import { PushNotificationService } from '../push/push.service';
import { buildPushFromNotification } from '../push/push-content';
import { RealtimeService } from '../../modules/realtime/realtime.service';

/**
 * In-app notification create-dən sonra best-effort WS + push.
 * Mail kimi fail-soft — booking axınını sındırmır.
 */
@Injectable()
export class NotificationChannelsService {
  private readonly logger = new Logger(NotificationChannelsService.name);

  constructor(
    private push: PushNotificationService,
    @Optional() private realtime?: RealtimeService,
  ) {}

  /**
   * WS `notification:new` + push həmişə (adapter noop ola bilər).
   */
  deliverAfterInApp(input: {
    userId: string;
    title: string;
    body: string;
    type: NotificationType | string;
    data?: Record<string, unknown> | null;
    serviceTitle?: string;
    scheduledAtLabel?: string;
    notificationId?: string;
  }): void {
    this.safeEmitWs(input);
    void this.safePush(input);
  }

  private safeEmitWs(input: {
    userId: string;
    title: string;
    body: string;
    type: NotificationType | string;
    notificationId?: string;
    data?: Record<string, unknown> | null;
  }): void {
    try {
      const href = input.data?.href;
      this.realtime?.emitNotificationNew(input.userId, {
        id: input.notificationId ?? randomUUID(),
        type: String(input.type),
        title: input.title,
        body: input.body,
        ...(typeof href === 'string' ? { href } : {}),
      });
    } catch (error) {
      this.logger.warn(
        `WS notification emit uğursuz: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private async safePush(input: {
    userId: string;
    title: string;
    body: string;
    type: NotificationType | string;
    data?: Record<string, unknown> | null;
  }): Promise<void> {
    try {
      const message = buildPushFromNotification(input);
      await this.push.sendToUser(input.userId, message);
    } catch (error) {
      this.logger.warn(
        `Push kanalı uğursuz: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
