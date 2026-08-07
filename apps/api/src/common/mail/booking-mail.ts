import { BookingStatus, NotificationType } from '@xidmetal/shared';

export interface BookingMailContent {
  subject: string;
  intro: string;
  body: string;
}

type BookingMailEvent =
  | NotificationType.BOOKING_CREATED
  | NotificationType.BOOKING_CONFIRMED
  | NotificationType.BOOKING_REJECTED
  | NotificationType.BOOKING_CANCELLED
  | NotificationType.BOOKING_COMPLETED
  | NotificationType.BOOKING_IN_PROGRESS
  | NotificationType.BOOKING_EN_ROUTE
  | NotificationType.BOOKING_ARRIVED;

/**
 * Kritik sifariş hadisələri üçün e-poçt məzmunu (AZ).
 * Saf funksiya — unit test üçün Nest DI tələb etmir.
 */
export function buildBookingMailContent(input: {
  event: BookingMailEvent;
  serviceTitle: string;
  scheduledAtLabel?: string;
  actorLabel?: string;
  cancelReason?: string;
}): BookingMailContent | null {
  const title = input.serviceTitle;

  switch (input.event) {
    case NotificationType.BOOKING_CREATED:
      return {
        subject: 'Xidmətal — Yeni sifariş',
        intro: 'Yeni sifariş aldınız',
        body: `«${title}» xidmətinizə yeni sifariş gəldi${
          input.scheduledAtLabel ? ` (${input.scheduledAtLabel})` : ''
        }. Dashboard-da baxın və cavab verin.`,
      };
    case NotificationType.BOOKING_CONFIRMED:
      return {
        subject: 'Xidmətal — Sifariş təsdiqləndi',
        intro: 'Sifarişiniz təsdiqləndi',
        body: `«${title}» sifarişiniz${
          input.scheduledAtLabel ? ` ${input.scheduledAtLabel} tarixinə` : ''
        } təsdiqləndi.`,
      };
    case NotificationType.BOOKING_REJECTED:
      return {
        subject: 'Xidmətal — Sifariş rədd edildi',
        intro: 'Sifarişiniz rədd edildi',
        body: `«${title}» sifarişiniz xidmət verən tərəfindən rədd edildi.`,
      };
    case NotificationType.BOOKING_CANCELLED:
      return {
        subject: 'Xidmətal — Sifariş ləğv edildi',
        intro: 'Sifariş ləğv edildi',
        body: `«${title}» sifarişi${
          input.actorLabel ? ` ${input.actorLabel} tərəfindən` : ''
        } ləğv edildi.${
          input.cancelReason ? ` Səbəb: ${input.cancelReason}` : ''
        }`,
      };
    case NotificationType.BOOKING_EN_ROUTE:
      return {
        subject: 'Xidmətal — Xidmət verən yoldadır',
        intro: 'Xidmət verən yola çıxdı',
        body: `«${title}» sifarişiniz üçün xidmət verən ünvanınıza doğru yoldadır.`,
      };
    case NotificationType.BOOKING_ARRIVED:
      return {
        subject: 'Xidmətal — Xidmət verən ünvanda',
        intro: 'Xidmət verən ünvana çatdı',
        body: `«${title}» sifarişiniz üçün xidmət verən ünvana çatıb.`,
      };
    case NotificationType.BOOKING_IN_PROGRESS:
      return {
        subject: 'Xidmətal — Sifariş başladı',
        intro: 'Sifarişiniz icra olunur',
        body: `«${title}» sifarişiniz indi icra olunur.`,
      };
    case NotificationType.BOOKING_COMPLETED:
      return {
        subject: 'Xidmətal — Sifariş tamamlandı',
        intro: 'Sifariş tamamlandı',
        body: `«${title}» sifarişiniz tamamlandı. İstəsəniz dashboard-da rəy yaza bilərsiniz.`,
      };
    default:
      return null;
  }
}

export function bookingStatusToMailEvent(
  status: BookingStatus,
): BookingMailEvent | null {
  switch (status) {
    case BookingStatus.CONFIRMED:
      return NotificationType.BOOKING_CONFIRMED;
    case BookingStatus.REJECTED:
      return NotificationType.BOOKING_REJECTED;
    case BookingStatus.CANCELLED:
      return NotificationType.BOOKING_CANCELLED;
    case BookingStatus.EN_ROUTE:
      return NotificationType.BOOKING_EN_ROUTE;
    case BookingStatus.ARRIVED:
      return NotificationType.BOOKING_ARRIVED;
    case BookingStatus.COMPLETED:
      return NotificationType.BOOKING_COMPLETED;
    case BookingStatus.IN_PROGRESS:
      return NotificationType.BOOKING_IN_PROGRESS;
    default:
      return null;
  }
}
