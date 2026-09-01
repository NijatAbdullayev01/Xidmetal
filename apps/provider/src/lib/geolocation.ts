/** Brauzer Geolocation API üçün vahid köməkçilər. */

export type GeoCoords = {
  lat: number;
  lng: number;
  heading: number | null;
};

export type GeoCoordsWithAccuracy = GeoCoords & {
  accuracyM: number | null;
  /** GPS oxunuşunda tez-tez dolu; Wi‑Fi/şəbəkə mövqeyində yoxdur */
  hasAltitude: boolean;
};

export type GeoPositionErrorCode =
  | 'unsupported'
  | 'permission_denied'
  | 'position_unavailable'
  | 'timeout'
  | 'aborted'
  | 'unknown';

/**
 * Chrome native `timeout`-u icazə pəncərəsindən də sayır.
 * JS deadline-ə əlavə ehtiyat — dialoq bağlanana qədər GPS-i kəsmə.
 */
const GEO_PERMISSION_GRACE_MS = 20_000;

/** Watch ilişəndə yenidən start — yalnız ilk callback-dən sonra. */
const GEO_WATCH_KICK_MS = 8_000;

/**
 * Bu dəqiqlikdən (metr) yaxşı oxunuş sıx GPS locku sayılır —
 * dərhal qəbul edilir (şəbəkə/Wi‑Fi oxunuşu bura düşmür).
 */
const GEO_TIGHT_LOCK_ACCURACY_M = 20;

/**
 * İlk kobud oxunuşdan sonra GPS-in dəqiqləşməsi üçün minimum gözləmə (ms).
 * Chrome ilk callback-də tez-tez şəbəkə mövqeyi verir; bu pəncərə olmadan
 * mövqe dəqiq GPS-ə çatmamış "yaxın amma dəqiq deyil" yerdə ilişir.
 */
const GEO_MIN_REFINE_WEBKIT_MS = 8_000;
const GEO_MIN_REFINE_DEFAULT_MS = 5_000;

/** Oxunuşlar dayandıqdan (yaxşılaşma bitdikdən) sonra ən yaxşını ver (ms). */
const GEO_SETTLE_AFTER_MS = 3_000;

export class GeoPositionError extends Error {
  readonly code: GeoPositionErrorCode;

  constructor(code: GeoPositionErrorCode, message: string) {
    super(message);
    this.name = 'GeoPositionError';
    this.code = code;
  }
}

export function geoPermissionDeniedMessage(
  webkit = isWebKitGeolocationEngine(),
  appleMobile = isAppleMobileGeolocation(),
): string {
  if (appleMobile) {
    return 'Mövqe üçün düyməyə basın. Açılmazsa: Ayarlar → Məxfilik → Məkan Xidmətləri → Safari → Soruş və ya İcazə ver';
  }
  if (webkit) {
    return 'Mövqe üçün düyməyə basın. Açılmazsa: Safari → Ayarlar → Vebsaytlar → Məkan Xidmətləri';
  }
  return 'Mövqe icazəsi verilmədi — ünvan çubuğundakı kilidə basıb Məkan → İcazə ver seçin';
}

export function geoErrorMessage(code: GeoPositionErrorCode): string {
  switch (code) {
    case 'unsupported':
      return 'Brauzeriniz mövqe paylaşımını dəstəkləmir';
    case 'permission_denied':
      return geoPermissionDeniedMessage();
    case 'position_unavailable':
      return 'Mövqe tapılmadı — ünvanı əl ilə yazın, cihazın məkan xidmətini və GPS-i yoxlayın';
    case 'timeout':
      return 'Mövqe sorğusu vaxt aşımına uğradı — ünvan çubuğunda məkan icazəsini yoxlayın və ya ünvanı əl ilə yazın';
    case 'aborted':
      return 'Mövqe sorğusu ləğv edildi';
    default:
      return 'Mövqe alınmadı — ünvanı əl ilə yaza bilərsiniz';
  }
}

/** Safari avtomatik GPS-i jest olmadan rədd edir — yalnız düymə. */
export function shouldAutoRequestGeolocation(
  webkit = isWebKitGeolocationEngine(),
): boolean {
  return !webkit;
}

/**
 * iOS (Safari/Chrome/Firefox) və masaüstü Safari — CoreLocation + WebKit.
 * Android Chrome buraya düşmür.
 */
export function isWebKitGeolocationEngine(
  userAgent: string = typeof navigator === 'undefined' ? '' : navigator.userAgent,
  maxTouchPoints: number = typeof navigator === 'undefined' ? 0 : navigator.maxTouchPoints,
  platform: string = typeof navigator === 'undefined' ? '' : navigator.platform,
): boolean {
  if (!userAgent) return false;
  const iOSDevice = /iP(ad|hone|od)/i.test(userAgent);
  const iPadOsDesktop = platform === 'MacIntel' && maxTouchPoints > 1;
  const desktopSafari =
    /Safari/i.test(userAgent) &&
    !/Chrome|Chromium|CriOS|FxiOS|Edg|OPR|Android/i.test(userAgent);
  return iOSDevice || iPadOsDesktop || desktopSafari;
}

export function isAppleMobileGeolocation(
  userAgent: string = typeof navigator === 'undefined' ? '' : navigator.userAgent,
  maxTouchPoints: number = typeof navigator === 'undefined' ? 0 : navigator.maxTouchPoints,
  platform: string = typeof navigator === 'undefined' ? '' : navigator.platform,
): boolean {
  if (/iP(ad|hone|od)/i.test(userAgent)) return true;
  return platform === 'MacIntel' && maxTouchPoints > 1;
}

export function defaultHighAccuracyWaitMs(
  webkit = isWebKitGeolocationEngine(),
): number {
  return webkit ? 28_000 : 20_000;
}

/** Yalnız icazə rəddi / dəstəklənməmə watch-u kəsir. TIMEOUT və UNAVAILABLE GPS istiləşməsidir. */
export function shouldAbortGeoWatchOnError(code: GeoPositionErrorCode): boolean {
  return code === 'permission_denied' || code === 'unsupported';
}

/**
 * watchPosition seçimləri.
 * Native `timeout` ötürülmür: Chrome icazə dialoqunu da sayır, TIMEOUT isə
 * watch-u kəsir; Safari-də isə ilk Wi‑Fi-dən sonra GPS heç vaxt çatmır.
 * Deadline yalnız JS timer-dir.
 */
export function buildWatchPositionOptions(params: {
  enableHighAccuracy: boolean;
  maximumAge: number;
  /** @deprecated Native timeout watch-u kəsir — istifadə olunmur */
  timeoutMs?: number;
  webkit?: boolean;
}): PositionOptions {
  return {
    enableHighAccuracy: params.enableHighAccuracy,
    maximumAge: params.maximumAge,
  };
}

export function isBetterGeoReading(
  next: GeoCoordsWithAccuracy,
  current: GeoCoordsWithAccuracy | null,
): boolean {
  if (!current) return true;
  const nextAcc = next.accuracyM ?? Number.POSITIVE_INFINITY;
  const curAcc = current.accuracyM ?? Number.POSITIVE_INFINITY;
  if (nextAcc + 5 < curAcc) return true;
  if (curAcc + 5 < nextAcc) return false;
  if (next.hasAltitude && !current.hasAltitude) return true;
  return nextAcc < curAcc;
}

export function geoAccuracyHint(accuracyM: number | null): string | null {
  if (accuracyM == null) return null;
  if (accuracyM > 300) {
    return isAppleMobileGeolocation()
      ? 'Təxmini yer gəldi — Ayarlar → Məxfilik → Məkan Xidmətləri → Safari → Dəqiq Məkanı açın və ya ünvanı əl ilə yazın'
      : 'GPS dəqiqliyi zəifdir — yenidən cəhd edin və ya ünvanı əl ilə yazın';
  }
  if (accuracyM > 100) return 'Siqnal zəifdir — açıq yerdə yenidən cəhd edin';
  return 'GPS dəqiqliyi yaxşıdır';
}

/**
 * Ayrıca `getCurrentPosition` (Wi‑Fi prime) Chrome-da icazə dialoqunu
 * qısa timeout-la öldürür. watchPosition özü şəbəkə mövqeyini birinci verir.
 */
export function shouldPrimeWithNetworkLocation(
  webkit = isWebKitGeolocationEngine(),
): boolean {
  void webkit;
  return false;
}

async function queryGeolocationPermission(): Promise<PermissionState | 'unknown'> {
  try {
    if (typeof navigator === 'undefined' || !navigator.permissions?.query) {
      return 'unknown';
    }
    const status = await navigator.permissions.query({ name: 'geolocation' });
    return status.state;
  } catch {
    return 'unknown';
  }
}

function getGeolocationSupportError(): GeoPositionError | null {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return new GeoPositionError('unsupported', geoErrorMessage('unsupported'));
  }

  if (typeof window !== 'undefined' && !window.isSecureContext) {
    return new GeoPositionError(
      'permission_denied',
      'Mövqe üçün sayt HTTPS və ya localhost üzərindən açılmalıdır',
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
    hasAltitude:
      pos.coords.altitude != null && Number.isFinite(pos.coords.altitude),
  };
}

function abortedError(): GeoPositionError {
  return new GeoPositionError('aborted', geoErrorMessage('aborted'));
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

export function readCurrentPosition(options?: PositionOptions): Promise<GeoCoords> {
  const webkit = isWebKitGeolocationEngine();
  return readPositionOnce({
    enableHighAccuracy: true,
    maximumAge: 0,
    ...(webkit ? {} : { timeout: 15_000 }),
    ...options,
  }).then(({ lat, lng, heading }) => ({ lat, lng, heading }));
}

/**
 * Sürətli ilkin oxunuş:
 * qısa-müddətli keş və ya şəbəkə mövqeyi ilə formu tez doldurur.
 * GPS-dən əvvəl çağırmayın — `shouldPrimeWithNetworkLocation`.
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
 * 1) enableHighAccuracy + watchPosition (native timeout yoxdur)
 * 2) TIMEOUT/UNAVAILABLE watch-u kəsmir — GPS istiləşə bilər
 * 3) icazə dialoqu JS deadline-ə daxil edilmir
 * 4) yalnız tam uğursuzluqda şəbəkə/Wi‑Fi fallback
 */
export async function readCurrentPositionWithFallback(options?: {
  /** Məqsəd dəqiqlik (metr) — default 40 */
  desiredAccuracyM?: number;
  /** GPS gözləmə (ms) — default WebKit 28s, Chrome 20s */
  highAccuracyWaitMs?: number;
  /** İcazə dialoqu üçün əlavə ehtiyat (ms) */
  permissionGraceMs?: number;
  /** Hər yaxşılaşan oxunuş — Bakı default-unda saxlamamaq üçün */
  onReading?: (reading: GeoCoordsWithAccuracy) => void;
  signal?: AbortSignal;
}): Promise<GeoCoordsWithAccuracy> {
  const desiredAccuracyM = options?.desiredAccuracyM ?? 40;
  const highAccuracyWaitMs =
    options?.highAccuracyWaitMs ?? defaultHighAccuracyWaitMs();

  const supportError = getGeolocationSupportError();
  if (supportError) {
    throw supportError;
  }

  if (options?.signal?.aborted) {
    throw abortedError();
  }

  try {
    return await watchBestPosition({
      enableHighAccuracy: true,
      desiredAccuracyM,
      maxWaitMs: highAccuracyWaitMs,
      maximumAge: 0,
      permissionGraceMs: options?.permissionGraceMs ?? GEO_PERMISSION_GRACE_MS,
      onReading: options?.onReading,
      signal: options?.signal,
    });
  } catch (err) {
    if (err instanceof GeoPositionError && err.code === 'permission_denied') {
      throw err;
    }
    if (err instanceof GeoPositionError && err.code === 'unsupported') {
      throw err;
    }
    if (err instanceof GeoPositionError && err.code === 'aborted') {
      throw err;
    }
  }

  if (options?.signal?.aborted) {
    throw abortedError();
  }

  try {
    return await readPositionOnce({
      enableHighAccuracy: false,
      timeout: 10_000,
      maximumAge: 60_000,
    });
  } catch (err) {
    if (err instanceof GeoPositionError) throw err;
    throw new GeoPositionError(
      'position_unavailable',
      geoErrorMessage('position_unavailable'),
    );
  }
}

/**
 * Sıx GPS locku — həqiqi mövqe sayılıb dərhal qəbul edilir.
 * Yalnız altitude yetərli deyil: bəzi Android oxunuşları altitude ilə gəlir,
 * amma dəqiqlik hələ 30–40 m olur; belələri refine pəncərəsində gözləməlidir.
 */
function looksLikeGpsFix(reading: GeoCoordsWithAccuracy): boolean {
  return reading.accuracyM != null && reading.accuracyM <= GEO_TIGHT_LOCK_ACCURACY_M;
}

/**
 * watchPosition ilə ən yaxşı oxunuşu seçir.
 * Refine timer ilk callback-dən sonra başlayır (icazə dialoqu sayılmır).
 */
function watchBestPosition(params: {
  enableHighAccuracy: boolean;
  desiredAccuracyM: number;
  maxWaitMs: number;
  maximumAge: number;
  permissionGraceMs: number;
  onReading?: (reading: GeoCoordsWithAccuracy) => void;
  signal?: AbortSignal;
}): Promise<GeoCoordsWithAccuracy> {
  const {
    enableHighAccuracy,
    desiredAccuracyM,
    maxWaitMs,
    maximumAge,
    permissionGraceMs,
    onReading,
    signal,
  } = params;
  const webkit = isWebKitGeolocationEngine();
  const minRefineMs = webkit ? GEO_MIN_REFINE_WEBKIT_MS : GEO_MIN_REFINE_DEFAULT_MS;
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    let best: GeoCoordsWithAccuracy | null = null;
    let settled = false;
    let watchId = 0;
    let kicked = false;
    let gotCallback = false;
    let refineTimer = 0;
    let settleTimer = 0;

    const clearWatch = () => {
      if (watchId !== 0) {
        navigator.geolocation.clearWatch(watchId);
        watchId = 0;
      }
    };

    const clearTimers = () => {
      window.clearTimeout(hardCapTimer);
      window.clearTimeout(kickTimer);
      window.clearTimeout(refineTimer);
      window.clearTimeout(settleTimer);
    };

    const finish = (result: GeoCoordsWithAccuracy) => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener('abort', onAbort);
      clearTimers();
      clearWatch();
      resolve(result);
    };

    const fail = (error: GeoPositionError) => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener('abort', onAbort);
      clearTimers();
      clearWatch();
      if (best && error.code !== 'aborted' && error.code !== 'permission_denied') {
        resolve(best);
        return;
      }
      reject(error);
    };

    const onAbort = () => {
      fail(abortedError());
    };

    /**
     * Yaxşılaşma dayananda ən yaxşı oxunuşu ver — amma minimum refine
     * pəncərəsindən əvvəl yox. Tək oxunuşlu masaüstündə (GPS yoxdur) uzun
     * gözləməni bağlayır, mobil GPS-də isə yığılmaya imkan verir.
     */
    const armSettleTimer = () => {
      window.clearTimeout(settleTimer);
      const sinceStart = Date.now() - startedAt;
      const wait = Math.max(GEO_SETTLE_AFTER_MS, minRefineMs - sinceStart);
      settleTimer = window.setTimeout(() => {
        if (best) finish(best);
      }, wait);
    };

    const maybeFinishBest = () => {
      if (!best || best.accuracyM == null) return;
      // Sıx GPS locku (≤20 m) — həqiqi mövqe, dərhal ver.
      if (looksLikeGpsFix(best)) {
        finish(best);
        return;
      }
      // Qəbul ediləbilən dəqiqlik, amma şəbəkə oxunuşu ola bilər —
      // GPS-in dəqiqləşməsi üçün minimum pəncərədən sonra ver.
      if (best.accuracyM <= desiredAccuracyM && Date.now() - startedAt >= minRefineMs) {
        finish(best);
      }
    };

    const armRefineTimer = () => {
      if (refineTimer) return;
      refineTimer = window.setTimeout(() => {
        if (best) {
          finish(best);
          return;
        }
        fail(new GeoPositionError('timeout', geoErrorMessage('timeout')));
      }, maxWaitMs);
    };

    const onPos = (pos: GeolocationPosition) => {
      gotCallback = true;
      armRefineTimer();
      const reading = fromGeolocationPosition(pos);
      if (isBetterGeoReading(reading, best)) {
        best = reading;
        onReading?.(reading);
        // Hər yaxşılaşma settle-i sıfırlayır — oxunuşlar dayananda ver.
        armSettleTimer();
      }
      maybeFinishBest();
    };

    const onErr = (err: GeolocationPositionError) => {
      const mapped = mapGeolocationError(err);
      if (shouldAbortGeoWatchOnError(mapped.code)) {
        fail(mapped);
        return;
      }
      // TIMEOUT / UNAVAILABLE: Chrome və Safari-də GPS hələ işə düşə bilər
      gotCallback = true;
      armRefineTimer();
    };

    const watchOptions = buildWatchPositionOptions({
      enableHighAccuracy,
      maximumAge,
      webkit,
    });

    const startWatch = () => {
      clearWatch();
      watchId = navigator.geolocation.watchPosition(onPos, onErr, watchOptions);
    };

    const hardCapTimer = window.setTimeout(() => {
      if (best) {
        finish(best);
        return;
      }
      fail(new GeoPositionError('timeout', geoErrorMessage('timeout')));
    }, maxWaitMs + permissionGraceMs);

    const kickTimer = window.setTimeout(() => {
      if (settled || kicked || !gotCallback) return;
      if (best?.accuracyM != null && best.accuracyM <= desiredAccuracyM) {
        return;
      }
      kicked = true;
      startWatch();
    }, GEO_WATCH_KICK_MS);

    if (signal) {
      if (signal.aborted) {
        fail(abortedError());
        return;
      }
      signal.addEventListener('abort', onAbort, { once: true });
    }

    startWatch();

    void queryGeolocationPermission().then((state) => {
      if (settled) return;
      if (state === 'denied') {
        fail(new GeoPositionError('permission_denied', geoErrorMessage('permission_denied')));
      }
    });
  });
}
