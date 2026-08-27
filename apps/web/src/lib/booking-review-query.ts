export function wantsBookingReviewOpen(
  searchParams: Record<string, string | string[] | undefined>,
): boolean {
  const value = searchParams.review;
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === '1' || raw === 'true';
}
