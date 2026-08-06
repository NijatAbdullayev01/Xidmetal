/** İki vaxt intervalının kəsişib-kəsişmədiyini yoxlayır (yarım-açıq [start, end)). */
export function rangesOverlap(
  aStartMs: number,
  aEndMs: number,
  bStartMs: number,
  bEndMs: number,
): boolean {
  return aStartMs < bEndMs && aEndMs > bStartMs;
}

export function bookingWindowEndMs(scheduledAtMs: number, durationMinutes: number): number {
  const duration = durationMinutes > 0 ? durationMinutes : 60;
  return scheduledAtMs + duration * 60_000;
}
