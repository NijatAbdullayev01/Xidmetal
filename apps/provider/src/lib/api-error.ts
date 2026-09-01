/** Nest/proxy İngilis default-larını UI-yə buraxmamaq üçün */
export function userFacingApiMessage(status: number, raw: unknown): string {
  const joined = Array.isArray(raw)
    ? raw.filter((part): part is string => typeof part === 'string').join(', ')
    : typeof raw === 'string'
      ? raw
      : '';
  if (status === 413) {
    return 'Şəkil çox böyükdür. Daha kiçik fayl seçin.';
  }
  if (
    status >= 500 &&
    (!joined || /internal server error|service unavailable|bad gateway|gateway timeout/i.test(joined))
  ) {
    return 'Xəta baş verdi. Bir az sonra yenidən cəhd edin.';
  }
  return joined || 'Xəta baş verdi';
}
