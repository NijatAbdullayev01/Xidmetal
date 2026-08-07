/**
 * On-demand dispatch — saf sıralama / növbəti namizəd məntiqi (Faza 4).
 * DB/Redis asılılığı yoxdur; unit test üçün əlverişlidir.
 */

export interface DispatchCandidate {
  providerId: string;
  distanceM: number;
  rating: number;
}

/**
 * Sıralama: məsafə artan, sonra reytinq azalan.
 */
export function rankDispatchCandidates(
  candidates: readonly DispatchCandidate[],
): DispatchCandidate[] {
  return [...candidates].sort((a, b) => {
    if (a.distanceM !== b.distanceM) {
      return a.distanceM - b.distanceM;
    }
    return b.rating - a.rating;
  });
}

/**
 * Artıq offer almış / istisna edilənləri keçib növbəti namizədi seç.
 */
export function selectNextDispatchCandidate(
  ranked: readonly DispatchCandidate[],
  excludeProviderIds: ReadonlySet<string>,
): DispatchCandidate | null {
  for (const candidate of ranked) {
    if (!excludeProviderIds.has(candidate.providerId)) {
      return candidate;
    }
  }
  return null;
}

/**
 * Sadə skor: yüksək reytinq + yaxın məsafə.
 * UI / audit üçün; sıralama `rankDispatchCandidates` ilə edilir.
 */
export function computeDispatchScore(distanceM: number, rating: number): number {
  const safeDistance = Number.isFinite(distanceM) ? Math.max(0, distanceM) : 0;
  const safeRating = Number.isFinite(rating) ? Math.max(0, rating) : 0;
  return Math.round(safeRating * 1000 - safeDistance);
}

/**
 * Accept race: yalnız PENDING offer + PENDING booking eyni transaction-da qalib ola bilər.
 * Pure helper — gözlənilən qalib sayı (0 və ya 1).
 */
export function resolveAcceptRaceWinners(
  attempts: readonly { offerPending: boolean; bookingPending: boolean }[],
): number {
  let winners = 0;
  let bookingStillPending = true;
  for (const attempt of attempts) {
    if (!bookingStillPending) break;
    if (attempt.offerPending && attempt.bookingPending) {
      winners += 1;
      bookingStillPending = false;
    }
  }
  return winners;
}
