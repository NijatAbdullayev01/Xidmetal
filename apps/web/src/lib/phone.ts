export const AZ_PHONE_PREFIX = '+994';

/** Yalnız rəqəmləri götürüb +994XXXXXXXXX (və ya boş) formata çevirir. Prefiks silinə bilməz. */
export function toAzPhoneValue(raw: string): string {
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('994')) digits = digits.slice(3);
  if (digits.startsWith('0')) digits = digits.slice(1);
  digits = digits.slice(0, 9);
  return digits ? `${AZ_PHONE_PREFIX}${digits}` : '';
}

export function azPhoneLocalPart(value: string | undefined): string {
  if (!value) return '';
  if (value.startsWith(AZ_PHONE_PREFIX)) return value.slice(AZ_PHONE_PREFIX.length);
  return value.replace(/\D/g, '').slice(0, 9);
}
