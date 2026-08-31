/**
 * On-demand dispatch — saf sıralama / növbəti namizəd məntiqi (Faza 4).
 * DB/Redis asılılığı yoxdur; unit test üçün əlverişlidir.
 */

import { DISPATCH } from './constants';

export interface DispatchCandidate {
  providerId: string;
  distanceM: number;
  rating: number;
}

/** INSTANT dispatch filtrləri — booking-də JSON kimi saxlanır */
export interface DispatchBookingPrefs {
  minRating?: number;
  minPrice?: number;
  maxPrice?: number;
  serviceCity?: string;
}

/** Rediscovery istisnası üçün offer sətiri */
export interface DispatchOfferExclusionInput {
  providerId: string;
  status: string;
  respondedAt?: Date | string | null;
}

export interface ProvidersExcludedOptions {
  now?: Date;
  /** Default: DISPATCH.DECLINE_REOFFER_COOLDOWN_SEC */
  declineReofferCooldownSec?: number;
}

function respondedAtMs(respondedAt: Date | string | null | undefined): number | null {
  if (respondedAt == null) return null;
  const ms =
    typeof respondedAt === 'string'
      ? new Date(respondedAt).getTime()
      : respondedAt.getTime();
  return Number.isFinite(ms) ? ms : null;
}

/**
 * Rediscovery-dan istisna ediləcək xidmət verənlər:
 * - PENDING / ACCEPTED təklifi olanlar
 * - REJECTED və imtina cooldown-u hələ bitməyənlər
 * Cooldown bitəndən sonra eyni xidmət verənə yenidən təklif göndərilə bilər
 * (axtarış pəncərəsi açıq qaldıqca).
 */
export function providersExcludedFromRedispatch(
  offers: readonly DispatchOfferExclusionInput[],
  options?: ProvidersExcludedOptions,
): Set<string> {
  const now = options?.now?.getTime() ?? Date.now();
  const cooldownSec =
    options?.declineReofferCooldownSec ?? DISPATCH.DECLINE_REOFFER_COOLDOWN_SEC;
  const cooldownMs =
    Number.isFinite(cooldownSec) && cooldownSec > 0 ? cooldownSec * 1000 : 0;

  const byProvider = new Map<string, DispatchOfferExclusionInput[]>();
  for (const offer of offers) {
    const list = byProvider.get(offer.providerId);
    if (list) {
      list.push(offer);
    } else {
      byProvider.set(offer.providerId, [offer]);
    }
  }

  const exclude = new Set<string>();

  for (const [providerId, providerOffers] of byProvider) {
    if (providerOffers.some((o) => o.status === 'PENDING')) {
      exclude.add(providerId);
      continue;
    }
    if (providerOffers.some((o) => o.status === 'ACCEPTED')) {
      exclude.add(providerId);
      continue;
    }
    if (providerOffers.some((o) => o.status === 'SKIPPED')) {
      exclude.add(providerId);
      continue;
    }

    const rejectedTimes = providerOffers
      .filter((o) => o.status === 'REJECTED')
      .map((o) => respondedAtMs(o.respondedAt))
      .filter((ms): ms is number => ms != null)
      .sort((a, b) => b - a);

    if (rejectedTimes.length > 0) {
      const latestRejectAt = rejectedTimes[0]!;
      // Kiçik grace — timer dəqiq cooldown sərhədində atəşləyəndə mane olmasın
      if (now + 250 < latestRejectAt + cooldownMs) {
        exclude.add(providerId);
      }
      // Cooldown bitib → yenidən təklifə uyğundur
      continue;
    }

    // CANCELLED / EXPIRED — yeni təklif göndərilə bilər (məs. xidmət alan skip)
  }

  return exclude;
}

/**
 * Axtarış pəncərəsi hələ açıqdırmı (windowStart + SEARCH_WINDOW_SEC).
 */
export function isDispatchSearchWindowOpen(
  createdAt: Date,
  now: Date,
  searchWindowSec: number,
): boolean {
  if (!Number.isFinite(searchWindowSec) || searchWindowSec <= 0) return false;
  return now.getTime() < createdAt.getTime() + searchWindowSec * 1000;
}

/**
 * INSTANT axtarış pəncərəsinin başlanğıcı.
 * Skip sonrası `dispatchWindowStartedAt` istifadə olunur.
 */
export function dispatchSearchWindowStart(
  createdAt: Date,
  dispatchWindowStartedAt?: Date | null,
): Date {
  return dispatchWindowStartedAt ?? createdAt;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Booking.dispatchPrefs JSON-unu təmizləyir.
 */
export function parseDispatchPrefs(raw: unknown): DispatchBookingPrefs | null {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }
  const record = raw as Record<string, unknown>;
  const prefs: DispatchBookingPrefs = {};
  if (isFiniteNumber(record.minRating) && record.minRating >= 0) {
    prefs.minRating = record.minRating;
  }
  if (isFiniteNumber(record.minPrice) && record.minPrice >= 0) {
    prefs.minPrice = record.minPrice;
  }
  if (isFiniteNumber(record.maxPrice) && record.maxPrice >= 0) {
    prefs.maxPrice = record.maxPrice;
  }
  if (typeof record.serviceCity === 'string' && record.serviceCity.trim()) {
    prefs.serviceCity = record.serviceCity.trim();
  }
  return Object.keys(prefs).length > 0 ? prefs : null;
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
