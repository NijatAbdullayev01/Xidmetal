import { ReportTargetType } from '@xidmetal/shared';

/**
 * Şikayət hədəfinə giriş — yalnız əlaqəli tərəf.
 * ID probing-i azaltmaq üçün servis «tapılmadı» mesajı ilə rədd edir.
 */

export function mayReportBooking(params: {
  reporterId: string;
  booking: { customerId: string; providerId: string } | null;
}): boolean {
  if (!params.booking) return false;
  return (
    params.booking.customerId === params.reporterId ||
    params.booking.providerId === params.reporterId
  );
}

export function mayReportService(params: {
  reporterId: string;
  service: { providerId: string } | null;
  hasCustomerBooking: boolean;
}): boolean {
  if (!params.service) return false;
  // Öz xidmətini şikayət etmək mənasızdır
  if (params.service.providerId === params.reporterId) return false;
  return params.hasCustomerBooking;
}

export function mayReportUser(params: {
  reporterId: string;
  targetUserId: string;
  targetExists: boolean;
  hasSharedBookingOrConversation: boolean;
}): boolean {
  if (!params.targetExists) return false;
  if (params.reporterId === params.targetUserId) return false;
  return params.hasSharedBookingOrConversation;
}

export function mayReportMessage(params: {
  reporterId: string;
  message: {
    conversation: { customerId: string; providerId: string };
  } | null;
}): boolean {
  if (!params.message) return false;
  const { customerId, providerId } = params.message.conversation;
  return customerId === params.reporterId || providerId === params.reporterId;
}

export function reportTargetNotFoundMessage(targetType: ReportTargetType): string {
  switch (targetType) {
    case ReportTargetType.USER:
      return 'İstifadəçi tapılmadı';
    case ReportTargetType.SERVICE:
      return 'Xidmət tapılmadı';
    case ReportTargetType.BOOKING:
      return 'Sifariş tapılmadı';
    case ReportTargetType.MESSAGE:
      return 'Mesaj tapılmadı';
    case ReportTargetType.OTHER:
      return 'Hədəf tapılmadı';
  }
}
