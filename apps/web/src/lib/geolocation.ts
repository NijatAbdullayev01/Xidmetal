/** Brauzer Geolocation API üçün vahid köməkçilər. */

export type GeoCoords = {
  lat: number;
  lng: number;
  heading: number | null;
};

export type GeoCoordsWithAccuracy = GeoCoords & {
  accuracyM: number | null;
};

export type GeoPositionErrorCode =
  | 'unsupported'
  | 'permission_denied'
  | 'position_unavailable'
  | 'timeout'
  | 'unknown';

export class GeoPositionError extends Error {
  readonly code: GeoPositionErrorCode;

  constructor(code: GeoPositionErrorCode, message: string) {
    super(message);
    this.name = 'GeoPositionError';
    this.code = code;
  }
}

export function geoErrorMessage(code: GeoPositionErrorCode): string {
  switch (code) {
    case 'unsupported':
      return 'Brauzeriniz konum paylaşımını dəstəkləmir';
    case 'permission_denied':
      return 'Konum icazəsi verilmədi — brauzer ayarlarından icazə verin';
    case 'position_unavailable':
      return 'Konum tapılmadı — xəritədən əl ilə seçin və ya GPS-i yoxlayın';
    case 'timeout':
      return 'Konum sorğusu vaxt aşımına uğradı — xəritədən seçin və ya yenidən cəhd edin';
    default:
      return 'Konum alınmadı — xəritədən əl ilə seçə bilərsiniz';
  }
}

function getGeolocationSupportError(): GeoPositionError | null {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return new GeoPositionError('unsupported', geoErrorMessage('unsupported'));
  }

  if (typeof window !== 'undefined' && !window.isSecureContext) {
    return new GeoPositionError(
      'permission_denied',
      'Konum üçün sayt HTTPS və ya localhost üzərindən açılmalıdır',
    );
  }

  return null;
}

function mapGeolocationError(err: GeolocationPositionError): GeoPositionError {
  switch (err.code) {
    case err.PERMISSION_DENIED:
      return new GeoPositionError('permission_denied', geoErrorMessage('permission_denied'));
    case err.POSITION_UNAVAILABLE:
      return new GeoPositionError(
        'position_unavailable',
        geoErrorMessage('position_unavailable'),
      );
    case err.TIMEOUT:
      return new GeoPositionError('timeout', geoErrorMessage('timeout'));
    default:
      return new GeoPositionError('unknown', geoErrorMessage('unknown'));
  }
}

function fromGeolocationPosition(pos: GeolocationPosition): GeoCoordsWithAccuracy {
  return {
    lat: pos.coords.latitude,
    lng: pos.coords.longitude,
    heading:
      pos.coords.heading != null && Number.isFinite(pos.coords.heading)
        ? pos.coords.heading
        : null,
    accuracyM: Number.isFinite(pos.coords.accuracy)
      ? Math.round(pos.coords.accuracy)
      : null,
  };
}

function readPositionOnce(options: PositionOptions): Promise<GeoCoordsWithAccuracy> {
  const supportError = getGeolocationSupportError();
  if (supportError) {
    return Promise.reject(supportError);
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(fromGeolocationPosition(pos)),
      (err) => reject(mapGeolocationError(err)),
      options,
    );
  });
}

function isBetterReading(
  next: GeoCoordsWithAccuracy,
  current: GeoCoordsWithAccuracy | null,
): boolean {
  if (!current) return true;
  const nextAcc = next.accuracyM ?? Number.POSITIVE_INFINITY;
  const curAcc = current.accuracyM ?? Number.POSITIVE_INFINITY;
  return nextAcc < curAcc;
}

export function readCurrentPosition(options?: PositionOptions): Promise<GeoCoords> {
  return readPositionOnce({
    enableHighAccuracy: true,
    timeout: 15_000,
    maximumAge: 0,
    ...options,
  }).then(({ lat, lng, heading }) => ({ lat, lng, heading }));
}

/**
 * Sürətli ilkin oxunuş:
 * qısa-müddətli keş və ya şəbəkə mövqeyi ilə xəritəni tez doldurur.
 */
export function readCachedPosition(options?: {
  maximumAgeMs?: number;
  timeoutMs?: number;
}): Promise<GeoCoordsWithAccuracy> {
  return readPositionOnce({
    enableHighAccuracy: false,
    timeout: options?.timeoutMs ?? 4_000,
    maximumAge: options?.maximumAgeMs ?? 60_000,
  });
}

/**
 * Bolt/Uber üslubu — təzə GPS oxunuşu:
 * 1) enableHighAccuracy + maximumAge:0
 * 2) watchPosition ilə dəqiqlik yaxşılaşana qədər (və ya timeout)
 * 3) yalnız tam uğursuzluqda şəbəkə/Wi‑Fi fallback
 */
export async function readCurrentPositionWithFallback(options?: {
  /** Məqsəd dəqiqlik (metr) — default 40 */
  desiredAccuracyM?: number;
  /** GPS gözləmə (ms) — default 12s */
  highAccuracyWaitMs?: number;
}): Promise<GeoCoordsWithAccuracy> {
  const desiredAccuracyM = options?.desiredAccuracyM ?? 40;
  const highAccuracyWaitMs = options?.highAccuracyWaitMs ?? 12_000;

  const supportError = getGeolocationSupportError();
  if (supportError) {
    throw supportError;
  }

  try {
    return await watchBestPosition({
      enableHighAccuracy: true,
      desiredAccuracyM,
      maxWaitMs: highAccuracyWaitMs,
      maximumAge: 0,
    });
  } catch (err) {
    if (err instanceof GeoPositionError && err.code === 'permission_denied') {
      throw err;
    }
    if (err instanceof GeoPositionError && err.code === 'unsupported') {
      throw err;
    }
  }

  // Şəbəkə/Wi‑Fi və qısa-müddətli keş — dəqiq GPS yoxdursa son çarə
  try {
    return await readPositionOnce({
      enableHighAccuracy: false,
      timeout: 10_000,
      maximumAge: 60_000,
    });
  } catch (err) {
    if (err instanceof GeoPositionError) throw err;
    throw new GeoPositionError('position_unavailable', geoErrorMessage('position_unavailable'));
  }
}

/**
 * watchPosition ilə ən yaxşı oxunuşu seçir.
 * Dəqiqlik hədəfə çatanda və ya maxWait bitəndə resolve.
 */
function watchBestPosition(params: {
  enableHighAccuracy: boolean;
  desiredAccuracyM: number;
  maxWaitMs: number;
  maximumAge: number;
}): Promise<GeoCoordsWithAccuracy> {
  const { enableHighAccuracy, desiredAccuracyM, maxWaitMs, maximumAge } = params;

  return new Promise((resolve, reject) => {
    let best: GeoCoordsWithAccuracy | null = null;
    let settled = false;

    const finish = (result: GeoCoordsWithAccuracy) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      navigator.geolocation.clearWatch(watchId);
      resolve(result);
    };

    const fail = (error: GeoPositionError) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      navigator.geolocation.clearWatch(watchId);
      if (best) {
        resolve(best);
        return;
      }
      reject(error);
    };

    const timer = window.setTimeout(() => {
      if (best) {
        finish(best);
        return;
      }
      fail(new GeoPositionError('timeout', geoErrorMessage('timeout')));
    }, maxWaitMs);

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const reading = fromGeolocationPosition(pos);
        if (isBetterReading(reading, best)) {
          best = reading;
        }
        const acc = best?.accuracyM;
        if (acc != null && acc <= desiredAccuracyM) {
          finish(best!);
        }
      },
      (err) => {
        // İcazə rədd — dərhal; digər xətalarda əgər best varsa onu qaytar
        const mapped = mapGeolocationError(err);
        if (mapped.code === 'permission_denied' || mapped.code === 'unsupported') {
          fail(mapped);
          return;
        }
        if (best) {
          finish(best);
          return;
        }
        fail(mapped);
      },
      {
        enableHighAccuracy,
        maximumAge,
        // watchPosition-da timeout hər yeniləmə üçündür; ümumi limit öz timer-imizdədir
        timeout: Math.max(maxWaitMs, 10_000),
      },
    );
  });
}
