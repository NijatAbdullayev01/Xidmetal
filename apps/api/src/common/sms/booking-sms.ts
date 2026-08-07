import { NotificationType, NOTIFICATION_CHANNELS } from '@xidmetal/shared';

export interface BookingSmsContent {
  body: string;
}

type SmsStatusEvent =
  | NotificationType.BOOKING_CREATED
  | NotificationType.BOOKING_CONFIRMED
  | NotificationType.BOOKING_REJECTED
  | NotificationType.BOOKING_CANCELLED
  | NotificationType.BOOKING_EN_ROUTE
  | NotificationType.BOOKING_ARRIVED
  | NotificationType.BOOKING_COMPLETED;

const SMS_TYPES = new Set<string>(NOTIFICATION_CHANNELS.SMS_STATUS_TYPES);

/**
 * Kritik sifariş statusları üçün SMS mətn (AZ). Saf funksiya.
 */
export function buildBookingSmsContent(input: {
  event: NotificationType | string;
  serviceTitle: string;
  scheduledAtLabel?: string;
}): BookingSmsContent | null {
  if (!SMS_TYPES.has(input.event)) return null;

  const title = input.serviceTitle;
  const event = input.event as SmsStatusEvent;

  switch (event) {
    case NotificationType.BOOKING_CREATED:
      return {
        body: `Xidmətal: «${title}» xidmətinə yeni sifariş gəldi. Dashboard-da baxın.`,
      };
    case NotificationType.BOOKING_CONFIRMED:
      return {
        body: `Xidmətal: «${title}» sifarişiniz${
          input.scheduledAtLabel ? ` (${input.scheduledAtLabel})` : ''
        } təsdiqləndi.`,
      };
    case NotificationType.BOOKING_REJECTED:
      return {
        body: `Xidmətal: «${title}» sifarişiniz rədd edildi.`,
      };
    case NotificationType.BOOKING_CANCELLED:
      return {
        body: `Xidmətal: «${title}» sifarişi ləğv edildi.`,
      };
    case NotificationType.BOOKING_EN_ROUTE:
      return {
        body: `Xidmətal: «${title}» — xidmət verən yoldadır.`,
      };
    case NotificationType.BOOKING_ARRIVED:
      return {
        body: `Xidmətal: «${title}» — xidmət verən ünvana çatıb.`,
      };
    case NotificationType.BOOKING_COMPLETED:
      return {
        body: `Xidmətal: «${title}» sifarişiniz tamamlandı.`,
      };
    default:
      return null;
  }
}

export function isSmsStatusEvent(type: string): boolean {
  return SMS_TYPES.has(type);
}
