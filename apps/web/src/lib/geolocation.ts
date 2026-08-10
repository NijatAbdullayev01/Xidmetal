/** Brauzer Geolocation API üçün vahid köməkçilər. */

export type GeoCoords = {
  lat: number;
  lng: number;
  heading: number | null;
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
      return 'Brauzeriniz mövqe paylaşımını dəstəkləmir';
    case 'permission_denied':
      return 'Mövqe icazəsi verilmədi — brauzer ayarlarından icazə verin';
    case 'position_unavailable':
      return 'Mövqe tapılmadı — GPS siqnalını yoxlayın';
    case 'timeout':
      return 'Mövqe sorğusu vaxt aşımına uğradı — yenidən cəhd edin';
    default:
      return 'Mövqe alınmadı';
  }
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

export function readCurrentPosition(options?: PositionOptions): Promise<GeoCoords> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return Promise.reject(
      new GeoPositionError('unsupported', geoErrorMessage('unsupported')),
    );
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          heading:
            pos.coords.heading != null && Number.isFinite(pos.coords.heading)
              ? pos.coords.heading
              : null,
        });
      },
      (err) => reject(mapGeolocationError(err)),
      {
        enableHighAccuracy: true,
        timeout: 15_000,
        maximumAge: 30_000,
        ...options,
      },
    );
  });
}
