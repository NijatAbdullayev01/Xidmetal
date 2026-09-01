import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildWatchPositionOptions,
  defaultHighAccuracyWaitMs,
  geoAccuracyHint,
  geoPermissionDeniedMessage,
  isAppleMobileGeolocation,
  isBetterGeoReading,
  isWebKitGeolocationEngine,
  readCurrentPositionWithFallback,
  shouldAbortGeoWatchOnError,
  shouldAutoRequestGeolocation,
  shouldPrimeWithNetworkLocation,
  type GeoCoordsWithAccuracy,
} from './geolocation';

const IPHONE_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';
const IPHONE_CHROME =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/123.0.6312.52 Mobile/15E148 Safari/604.1';
const DESKTOP_SAFARI =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15';
const DESKTOP_CHROME =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36';
const ANDROID_CHROME =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Mobile Safari/537.36';

function reading(
  partial: Partial<GeoCoordsWithAccuracy> & Pick<GeoCoordsWithAccuracy, 'lat' | 'lng'>,
): GeoCoordsWithAccuracy {
  return {
    heading: null,
    accuracyM: null,
    hasAltitude: false,
    ...partial,
  };
}

function geoPos(
  lat: number,
  lng: number,
  accuracy: number,
  altitude: number | null = null,
): GeolocationPosition {
  return {
    timestamp: Date.now(),
    coords: {
      latitude: lat,
      longitude: lng,
      accuracy,
      altitude,
      altitudeAccuracy: altitude == null ? null : 8,
      heading: null,
      speed: null,
      toJSON() {
        return this;
      },
    },
  } as GeolocationPosition;
}

function timeoutError(): GeolocationPositionError {
  return {
    code: 3,
    message: 'Timeout expired',
    PERMISSION_DENIED: 1,
    POSITION_UNAVAILABLE: 2,
    TIMEOUT: 3,
  };
}

function unavailableError(): GeolocationPositionError {
  return {
    code: 2,
    message: 'Position unavailable',
    PERMISSION_DENIED: 1,
    POSITION_UNAVAILABLE: 2,
    TIMEOUT: 3,
  };
}

describe('WebKit geolocation detection', () => {
  it('iPhone Safari, iOS Chrome və masaüstü Safari-ni WebKit sayır', () => {
    expect(isWebKitGeolocationEngine(IPHONE_SAFARI, 5, 'iPhone')).toBe(true);
    expect(isWebKitGeolocationEngine(IPHONE_CHROME, 5, 'iPhone')).toBe(true);
    expect(isWebKitGeolocationEngine(DESKTOP_SAFARI, 0, 'MacIntel')).toBe(true);
    expect(isWebKitGeolocationEngine(DESKTOP_CHROME, 0, 'MacIntel')).toBe(false);
    expect(isWebKitGeolocationEngine(ANDROID_CHROME, 5, 'Linux armv8l')).toBe(false);
  });

  it('iPadOS desktop UA-nı mobil Apple sayır', () => {
    expect(isAppleMobileGeolocation(DESKTOP_SAFARI, 5, 'MacIntel')).toBe(true);
    expect(isAppleMobileGeolocation(DESKTOP_SAFARI, 0, 'MacIntel')).toBe(false);
  });

  it('heç bir mühərrikdə Wi‑Fi prime və native timeout yoxdur', () => {
    expect(shouldPrimeWithNetworkLocation(true)).toBe(false);
    expect(shouldPrimeWithNetworkLocation(false)).toBe(false);
    expect(defaultHighAccuracyWaitMs(true)).toBe(28_000);
    expect(defaultHighAccuracyWaitMs(false)).toBe(20_000);

    const safariWatch = buildWatchPositionOptions({
      enableHighAccuracy: true,
      maximumAge: 0,
      timeoutMs: 12_000,
      webkit: true,
    });
    expect(safariWatch.timeout).toBeUndefined();
    expect(safariWatch.enableHighAccuracy).toBe(true);

    const chromeWatch = buildWatchPositionOptions({
      enableHighAccuracy: true,
      maximumAge: 0,
      timeoutMs: 12_000,
      webkit: false,
    });
    expect(chromeWatch.timeout).toBeUndefined();
  });

  it('yalnız icazə/unsupported watch-u kəsir', () => {
    expect(shouldAbortGeoWatchOnError('permission_denied')).toBe(true);
    expect(shouldAbortGeoWatchOnError('unsupported')).toBe(true);
    expect(shouldAbortGeoWatchOnError('timeout')).toBe(false);
    expect(shouldAbortGeoWatchOnError('position_unavailable')).toBe(false);
  });

  it('Safari avtomatik GPS sorğumur və icazə mətnini jestə yönləndirir', () => {
    expect(shouldAutoRequestGeolocation(true)).toBe(false);
    expect(shouldAutoRequestGeolocation(false)).toBe(true);
    expect(geoPermissionDeniedMessage(true, true)).toContain('düyməyə basın');
    expect(geoPermissionDeniedMessage(true, true)).toContain('Safari');
    expect(geoPermissionDeniedMessage(false, false)).toContain('kilid');
  });
});

describe('isBetterGeoReading', () => {
  it('daha dəqiq oxunuşu seçir', () => {
    const wifi = reading({ lat: 40.4, lng: 49.8, accuracyM: 165, hasAltitude: false });
    const gps = reading({ lat: 40.401, lng: 49.801, accuracyM: 12, hasAltitude: true });
    expect(isBetterGeoReading(gps, wifi)).toBe(true);
    expect(isBetterGeoReading(wifi, gps)).toBe(false);
  });

  it('oxşar dəqiqlikdə altitude (GPS) üstün tutulur', () => {
    const wifi = reading({ lat: 40.4, lng: 49.8, accuracyM: 40, hasAltitude: false });
    const gps = reading({ lat: 40.4, lng: 49.8, accuracyM: 38, hasAltitude: true });
    expect(isBetterGeoReading(gps, wifi)).toBe(true);
  });
});

describe('geoAccuracyHint', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('iPhone-da dəqiq məkan addımlarını göstərir', () => {
    vi.stubGlobal('navigator', {
      userAgent: IPHONE_SAFARI,
      maxTouchPoints: 5,
      platform: 'iPhone',
    });
    expect(geoAccuracyHint(1200)).toContain('Dəqiq Məkan');
    expect(geoAccuracyHint(40)).toContain('yaxşıdır');
  });
});

describe('readCurrentPositionWithFallback', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function stubSecureWindow(): void {
    vi.stubGlobal('window', {
      isSecureContext: true,
      setTimeout: globalThis.setTimeout.bind(globalThis),
      clearTimeout: globalThis.clearTimeout.bind(globalThis),
    });
  }

  it('Safari TIMEOUT-dan sonra GPS oxunuşunu saxlayır', async () => {
    stubSecureWindow();
    const watchPosition = vi.fn(
      (
        success: PositionCallback,
        error: PositionErrorCallback,
        options?: PositionOptions,
      ) => {
        expect(options?.timeout).toBeUndefined();
        queueMicrotask(() => error(timeoutError()));
        setTimeout(() => success(geoPos(40.4093, 49.8671, 11, 18)), 20);
        return 1;
      },
    );

    vi.stubGlobal('navigator', {
      userAgent: IPHONE_SAFARI,
      maxTouchPoints: 5,
      platform: 'iPhone',
      geolocation: {
        watchPosition,
        getCurrentPosition: vi.fn(),
        clearWatch: vi.fn(),
      },
    });

    const result = await readCurrentPositionWithFallback({
      desiredAccuracyM: 40,
      highAccuracyWaitMs: 400,
    });

    expect(result.lat).toBeCloseTo(40.4093);
    expect(result.lng).toBeCloseTo(49.8671);
    expect(result.accuracyM).toBe(11);
    expect(result.hasAltitude).toBe(true);
    expect(watchPosition).toHaveBeenCalled();
  });

  it('Chrome-da watchPosition-a native timeout ötürülmür', async () => {
    stubSecureWindow();
    const watchPosition = vi.fn(
      (success: PositionCallback, _error: PositionErrorCallback, options?: PositionOptions) => {
        expect(options?.timeout).toBeUndefined();
        success(geoPos(40.37, 49.83, 8, 12));
        return 1;
      },
    );

    vi.stubGlobal('navigator', {
      userAgent: DESKTOP_CHROME,
      maxTouchPoints: 0,
      platform: 'MacIntel',
      geolocation: {
        watchPosition,
        getCurrentPosition: vi.fn(),
        clearWatch: vi.fn(),
      },
    });

    const result = await readCurrentPositionWithFallback({
      desiredAccuracyM: 40,
      highAccuracyWaitMs: 400,
      permissionGraceMs: 0,
    });
    expect(result.accuracyM).toBe(8);
  });

  it('Chrome POSITION_UNAVAILABLE-dan sonra GPS oxunuşunu saxlayır', async () => {
    stubSecureWindow();
    const watchPosition = vi.fn(
      (
        success: PositionCallback,
        error: PositionErrorCallback,
        options?: PositionOptions,
      ) => {
        expect(options?.timeout).toBeUndefined();
        queueMicrotask(() => error(unavailableError()));
        setTimeout(() => success(geoPos(40.4093, 49.8671, 11, 18)), 20);
        return 1;
      },
    );

    vi.stubGlobal('navigator', {
      userAgent: DESKTOP_CHROME,
      maxTouchPoints: 0,
      platform: 'MacIntel',
      geolocation: {
        watchPosition,
        getCurrentPosition: vi.fn(),
        clearWatch: vi.fn(),
      },
    });

    const result = await readCurrentPositionWithFallback({
      desiredAccuracyM: 40,
      highAccuracyWaitMs: 400,
      permissionGraceMs: 0,
    });

    expect(result.lat).toBeCloseTo(40.4093);
    expect(result.accuracyM).toBe(11);
    expect(result.hasAltitude).toBe(true);
  });

  it('AbortSignal ilə watch-u ləğv edir', async () => {
    stubSecureWindow();
    const clearWatch = vi.fn();
    const watchPosition = vi.fn(() => 7);

    vi.stubGlobal('navigator', {
      userAgent: DESKTOP_CHROME,
      maxTouchPoints: 0,
      platform: 'MacIntel',
      geolocation: {
        watchPosition,
        getCurrentPosition: vi.fn(),
        clearWatch,
      },
    });

    const controller = new AbortController();
    const pending = readCurrentPositionWithFallback({
      desiredAccuracyM: 40,
      highAccuracyWaitMs: 5_000,
      permissionGraceMs: 0,
      signal: controller.signal,
    });

    await Promise.resolve();
    controller.abort();

    await expect(pending).rejects.toMatchObject({ code: 'aborted' });
    expect(clearWatch).toHaveBeenCalledWith(7);
  });

  it('Chrome kobud şəbəkə oxunuşunu dərhal qəbul etmir, GPS-i gözləyir', async () => {
    stubSecureWindow();
    const cb: { current: PositionCallback | null } = { current: null };
    const watchPosition = vi.fn((success: PositionCallback) => {
      cb.current = success;
      // İlk oxunuş: kobud şəbəkə/Wi‑Fi mövqeyi (altitude yoxdur, 30 m).
      // desiredAccuracyM (40) altındadır, amma sıx GPS locku deyil.
      success(geoPos(40.4, 49.8, 30, null));
      return 1;
    });

    vi.stubGlobal('navigator', {
      userAgent: DESKTOP_CHROME,
      maxTouchPoints: 0,
      platform: 'MacIntel',
      geolocation: {
        watchPosition,
        getCurrentPosition: vi.fn(),
        clearWatch: vi.fn(),
      },
    });

    const pending = readCurrentPositionWithFallback({
      desiredAccuracyM: 40,
      highAccuracyWaitMs: 20_000,
      permissionGraceMs: 0,
    });

    // Kobud oxunuş dərhal həll etməməlidir — mikro-tapşırıqlar boşalsa belə.
    await Promise.resolve();
    await Promise.resolve();

    // Sıx GPS locku (≤20 m) gəlir → indi həll olur.
    cb.current?.(geoPos(40.409, 49.867, 10, 18));

    const result = await pending;
    expect(result.accuracyM).toBe(10);
  });

  it('ilk kobud oxunuşu onReading ilə dərhal verir', async () => {
    stubSecureWindow();
    const accuracies: number[] = [];
    const watchPosition = vi.fn((success: PositionCallback) => {
      success(geoPos(40.4, 49.8, 165, null));
      setTimeout(() => success(geoPos(40.409, 49.867, 12, 20)), 25);
      return 1;
    });

    vi.stubGlobal('navigator', {
      userAgent: DESKTOP_CHROME,
      maxTouchPoints: 0,
      platform: 'MacIntel',
      geolocation: {
        watchPosition,
        getCurrentPosition: vi.fn(),
        clearWatch: vi.fn(),
      },
    });

    const result = await readCurrentPositionWithFallback({
      desiredAccuracyM: 40,
      highAccuracyWaitMs: 400,
      onReading: (reading) => {
        if (reading.accuracyM != null) accuracies.push(reading.accuracyM);
      },
    });

    expect(accuracies[0]).toBe(165);
    expect(result.accuracyM).toBe(12);
  });
});
