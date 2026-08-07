import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { NotificationType } from '@xidmetal/shared';
import { PushNotificationService } from '../push/push.service';
import { buildPushFromNotification } from '../push/push-content';
import { SmsService } from '../sms/sms.service';
import { buildBookingSmsContent, isSmsStatusEvent } from '../sms/booking-sms';
import { RealtimeService } from '../../modules/realtime/realtime.service';

/**
 * In-app notification create-dən sonra best-effort WS + push + opsional SMS.
 * Mail kimi fail-soft — booking axınını sındırmır.
 */
@Injectable()
export class NotificationChannelsService {
  private readonly logger = new Logger(NotificationChannelsService.name);
  private readonly smsStatusEnabled: boolean;

  constructor(
    private push: PushNotificationService,
    private sms: SmsService,
    private config: ConfigService,
    @Optional() private realtime?: RealtimeService,
  ) {
    this.smsStatusEnabled =
      this.config.get<string>('SMS_STATUS_ENABLED')?.trim().toLowerCase() ===
      'true';
  }

  /**
   * WS `notification:new` + push həmişə (adapter noop ola bilər).
   * SMS yalnız SMS_STATUS_ENABLED + təsdiqlənmiş phone + kritik tip.
   */
  deliverAfterInApp(input: {
    userId: string;
    title: string;
    body: string;
    type: NotificationType | string;
    data?: Record<string, unknown> | null;
    phone?: string | null;
    /** SMS yalnız phoneVerifiedAt set olduqda */
    phoneVerifiedAt?: Date | string | null;
    serviceTitle?: string;
    scheduledAtLabel?: string;
    notificationId?: string;
  }): void {
    this.safeEmitWs(input);
    void this.safePush(input);
    void this.safeSms(input);
  }

  private safeEmitWs(input: {
    userId: string;
    title: string;
    body: string;
    type: NotificationType | string;
    notificationId?: string;
  }): void {
    try {
      this.realtime?.emitNotificationNew(input.userId, {
        id: input.notificationId ?? randomUUID(),
        type: String(input.type),
        title: input.title,
        body: input.body,
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

  private async safeSms(input: {
    userId: string;
    type: NotificationType | string;
    phone?: string | null;
    phoneVerifiedAt?: Date | string | null;
    serviceTitle?: string;
    scheduledAtLabel?: string;
    body: string;
  }): Promise<void> {
    if (!this.smsStatusEnabled) return;
    if (!input.phone?.trim()) return;
    if (!input.phoneVerifiedAt) {
      this.logger.debug(
        `SMS skip — telefon təsdiqlənməyib user=${input.userId}`,
      );
      return;
    }
    if (!isSmsStatusEvent(String(input.type))) return;

    try {
      const content = buildBookingSmsContent({
        event: input.type,
        serviceTitle: input.serviceTitle ?? 'Sifariş',
        scheduledAtLabel: input.scheduledAtLabel,
      });
      if (!content) return;

      await this.sms.send({
        to: input.phone.trim(),
        body: content.body,
      });
    } catch (error) {
      this.logger.warn(
        `SMS kanalı uğursuz: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
