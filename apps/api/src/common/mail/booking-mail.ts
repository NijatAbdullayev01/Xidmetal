import { BookingStatus, NotificationType, bookingOrderNumberLabel } from '@xidmetal/shared';

export interface BookingMailContent {
  subject: string;
  intro: string;
  body: string;
}

export interface BookingMailThread {
  messageId: string;
  entityRefId: string;
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

/** Eyni sifariş nömrəsi = eyni mövzu (Gmail söhbəti); fərqli nömrələr ayrı qalır. */
export function bookingMailSubject(eventTitle: string, orderNumber?: string): string {
  if (orderNumber) {
    return `Xidmətal — ${bookingOrderNumberLabel(orderNumber)}`;
  }
  return `Xidmətal — ${eventTitle}`;
}

/** Eyni sifariş üçün sabit entity ref + unikal Message-ID (From domeni). */
export function buildBookingMailThread(input: {
  orderNumber: string;
  uniqueSuffix?: string;
}): BookingMailThread | null {
  const token = input.orderNumber.replace(/[^A-Za-z0-9-]/g, '');
  if (!token) return null;
  const unique =
    (input.uniqueSuffix ??
      `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`).replace(
      /[^A-Za-z0-9-]/g,
      '',
    ) || 'n';
  return {
    messageId: `<booking-${token}-${unique}@xidmetal.com>`,
    entityRefId: `booking-${token}`,
  };
}

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
  orderNumber?: string;
}): BookingMailContent | null {
  const title = input.serviceTitle;
  const orderRef = input.orderNumber
    ? ` Sifariş nömrəsi: ${input.orderNumber}.`
    : '';
  const subject = (eventTitle: string) =>
    bookingMailSubject(eventTitle, input.orderNumber);

  switch (input.event) {
    case NotificationType.BOOKING_CREATED:
      return {
        subject: subject('Yeni sifariş'),
        intro: 'Yeni sifariş aldınız',
        body: `«${title}» xidmətinizə yeni sifariş gəldi${
          input.scheduledAtLabel ? ` (${input.scheduledAtLabel})` : ''
        }. Dashboard-da baxın və cavab verin.${orderRef}`,
      };
    case NotificationType.BOOKING_CONFIRMED:
      return {
        subject: subject('Sifariş təsdiqləndi'),
        intro: 'Sifarişiniz təsdiqləndi',
        body: `«${title}» sifarişiniz${
          input.scheduledAtLabel ? ` ${input.scheduledAtLabel} tarixinə` : ''
        } təsdiqləndi.${orderRef}`,
      };
    case NotificationType.BOOKING_REJECTED:
      return {
        subject: subject('Sifariş rədd edildi'),
        intro: 'Sifarişiniz rədd edildi',
        body: `«${title}» sifarişiniz xidmət verən tərəfindən rədd edildi.${orderRef}`,
      };
    case NotificationType.BOOKING_CANCELLED:
      return {
        subject: subject('Sifariş ləğv edildi'),
        intro: 'Sifariş ləğv edildi',
        body: `«${title}» sifarişi${
          input.actorLabel ? ` ${input.actorLabel} tərəfindən` : ''
        } ləğv edildi.${
          input.cancelReason ? ` Səbəb: ${input.cancelReason}` : ''
        }${orderRef}`,
      };
    case NotificationType.BOOKING_EN_ROUTE:
      return {
        subject: subject('Xidmət verən yoldadır'),
        intro: 'Xidmət verən yola çıxdı',
        body: `«${title}» sifarişiniz üçün xidmət verən ünvanınıza doğru yoldadır.${orderRef}`,
      };
    case NotificationType.BOOKING_ARRIVED:
      return {
        subject: subject('Xidmət verən ünvanda'),
        intro: 'Xidmət verən ünvana çatdı',
        body: `«${title}» sifarişiniz üçün xidmət verən ünvana çatıb.${orderRef}`,
      };
    case NotificationType.BOOKING_IN_PROGRESS:
      return {
        subject: subject('Sifariş başladı'),
        intro: 'Sifarişiniz icra olunur',
        body: `«${title}» sifarişiniz indi icra olunur.${orderRef}`,
      };
    case NotificationType.BOOKING_COMPLETED:
      return {
        subject: subject('Sifariş tamamlandı'),
        intro: 'Sifariş tamamlandı',
        body: `«${title}» sifarişiniz tamamlandı.${orderRef}`,
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

/** Müştəriyə status e-poçtu yalnız xidmət verən təsdiqində və tamamlanmada. */
export function shouldSendCustomerStatusMail(status: BookingStatus): boolean {
  return (
    status === BookingStatus.CONFIRMED ||
    status === BookingStatus.COMPLETED
  );
}
