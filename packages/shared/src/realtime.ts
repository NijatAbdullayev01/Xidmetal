import { BookingStatus } from './enums';
import { haversineDistanceMeters, type GeoPoint } from './geo';

/** Socket.IO event adları — client/server eyni contract */
export const REALTIME_EVENTS = {
  LOCATION_PUSH: 'location:push',
  LOCATION_UPDATE: 'location:update',
  BOOKING_SUBSCRIBE: 'booking:subscribe',
  BOOKING_UNSUBSCRIBE: 'booking:unsubscribe',
  BOOKING_STATUS: 'booking:status',
  NOTIFICATION_NEW: 'notification:new',
  /** Provider otağına yeni dispatch təklifi */
  DISPATCH_OFFER: 'dispatch:offer',
  /** Təklif vaxtı bitdi */
  DISPATCH_OFFER_EXPIRED: 'dispatch:offer-expired',
  /** Təklif qəbul/rədd nəticəsi (provider + booking otağı) */
  DISPATCH_OFFER_RESULT: 'dispatch:offer-result',
} as const;

export type RealtimeEvent = (typeof REALTIME_EVENTS)[keyof typeof REALTIME_EVENTS];

/** Provider → server: canlı mövqe */
export interface LocationPushPayload {
  bookingId: string;
  lat: number;
  lng: number;
  heading?: number | null;
  speed?: number | null;
}

/** Server → booking otağı */
export interface LocationUpdatePayload {
  bookingId: string;
  lat: number;
  lng: number;
  heading?: number | null;
  speed?: number | null;
  /** Təxmini ETA (saniyə); Directions və ya haversine fallback */
  etaSeconds?: number | null;
  distanceMeters?: number | null;
  recordedAt: string;
}

export interface BookingSubscribePayload {
  bookingId: string;
}

export interface BookingStatusPayload {
  bookingId: string;
  status: BookingStatus;
  timestamp: string;
}

export interface NotificationNewPayload {
  id: string;
  type: string;
  title: string;
  body: string;
}

/** Server → provider:{id} — yeni on-demand təklif */
export interface DispatchOfferPayload {
  offerId: string;
  bookingId: string;
  serviceTitle: string;
  address?: string | null;
  destLat?: number | null;
  destLng?: number | null;
  distanceM?: number | null;
  expiresAt: string;
  scheduledAt: string;
}

export interface DispatchOfferExpiredPayload {
  offerId: string;
  bookingId: string;
}

export interface DispatchOfferResultPayload {
  offerId: string;
  bookingId: string;
  status: 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'CANCELLED';
  providerId?: string;
}

export interface LocationPingSummary {
  id: string;
  bookingId: string;
  lat: number;
  lng: number;
  heading?: number | null;
  speed?: number | null;
  recordedAt: string;
}

/** Lokasiya göndərməyə icazəli sifariş statusları */
export const TRACKABLE_BOOKING_STATUSES: readonly BookingStatus[] = [
  BookingStatus.EN_ROUTE,
  BookingStatus.ARRIVED,
  BookingStatus.IN_PROGRESS,
] as const;

export function isTrackableBookingStatus(status: BookingStatus): boolean {
  return (TRACKABLE_BOOKING_STATUSES as readonly string[]).includes(status);
}

/** Provider location:push min interval (~3–5s) */
export const LOCATION_PUSH_MIN_INTERVAL_MS = 3_000;

/** LocationPing DB sampling interval */
export const LOCATION_PING_SAMPLE_INTERVAL_MS = 15_000;

/** Şəhər daxili orta sürət fallback (~30 km/s → m/s) */
export const DEFAULT_ETA_SPEED_MPS = 30_000 / 3_600;

export function bookingRoom(bookingId: string): string {
  return `booking:${bookingId}`;
}

export function userRoom(userId: string): string {
  return `user:${userId}`;
}

export function providerRoom(providerId: string): string {
  return `provider:${providerId}`;
}

export function parseBookingRoomId(room: string): string | null {
  const prefix = 'booking:';
  if (!room.startsWith(prefix)) return null;
  const id = room.slice(prefix.length).trim();
  return id.length > 0 ? id : null;
}

/**
 * Server-side throttle: son push-dan interval keçməyibsə rədd.
 * `lastPushAt` null → qəbul.
 */
export function shouldAcceptLocationPush(
  lastPushAtMs: number | null | undefined,
  nowMs: number,
  intervalMs: number = LOCATION_PUSH_MIN_INTERVAL_MS,
): boolean {
  if (lastPushAtMs == null) return true;
  return nowMs - lastPushAtMs >= intervalMs;
}

/**
 * DB sampling: hər N ms-də bir LocationPing yaz.
 */
export function shouldSampleLocationPing(
  lastSampledAtMs: number | null | undefined,
  nowMs: number,
  intervalMs: number = LOCATION_PING_SAMPLE_INTERVAL_MS,
): boolean {
  if (lastSampledAtMs == null) return true;
  return nowMs - lastSampledAtMs >= intervalMs;
}

/** Haversine + orta sürət ilə ETA (saniyə) */
export function estimateEtaSeconds(
  from: GeoPoint,
  to: GeoPoint,
  speedMps: number = DEFAULT_ETA_SPEED_MPS,
): { distanceMeters: number; etaSeconds: number } {
  const distanceMeters = haversineDistanceMeters(from, to);
  const safeSpeed = speedMps > 0.5 ? speedMps : DEFAULT_ETA_SPEED_MPS;
  const etaSeconds = Math.max(0, Math.round(distanceMeters / safeSpeed));
  return { distanceMeters, etaSeconds };
}
