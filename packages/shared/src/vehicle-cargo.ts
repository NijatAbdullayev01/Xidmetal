import { CargoRouteScope } from './enums';

/** Nəqliyyat kateqoriyası slug */
export const TRANSPORT_CATEGORY_SLUG = 'neqliyyat';

/** Yükdaşıma xidmət növləri — maşın ölçüsü, marşrut və avtomobil şəkli məcburidir */
export const CARGO_TRANSPORT_SERVICE_TYPES = [
  'Kiçik yükdaşıma',
  'Orta yükdaşıma',
  'Böyük yükdaşıma',
] as const;

export type CargoTransportServiceType = (typeof CARGO_TRANSPORT_SERVICE_TYPES)[number];

/** Evakuator — yalnız daşıma marşrutu məcburidir (ölçü tələb olunmur) */
export const EVAKUATOR_SERVICE_TYPE = 'Evakuator' as const;

/** Nəqliyyat kateqoriyasının bütün sabit xidmət növləri */
export const TRANSPORT_SERVICE_TYPES = [
  ...CARGO_TRANSPORT_SERVICE_TYPES,
  EVAKUATOR_SERVICE_TYPE,
] as const;

export type TransportServiceType = (typeof TRANSPORT_SERVICE_TYPES)[number];

export const CARGO_ROUTE_SCOPE_VALUES = [
  CargoRouteScope.INTRA_CITY,
  CargoRouteScope.INTERCITY,
  CargoRouteScope.BOTH,
] as const;

export type CargoRouteScopeValue = (typeof CARGO_ROUTE_SCOPE_VALUES)[number];

export const CARGO_ROUTE_SCOPE_LABELS: Record<CargoRouteScopeValue, string> = {
  [CargoRouteScope.INTRA_CITY]: 'Şəhərdaxili',
  [CargoRouteScope.INTERCITY]: 'Şəhərlərarası',
  [CargoRouteScope.BOTH]: 'Hər ikisi',
};

export const CARGO_ROUTE_SCOPE_DESCRIPTIONS: Record<CargoRouteScopeValue, string> = {
  [CargoRouteScope.INTRA_CITY]: 'Yalnız eyni şəhər daxilində daşıma edirəm',
  [CargoRouteScope.INTERCITY]: 'Yalnız şəhərlər arasında daşıma edirəm',
  [CargoRouteScope.BOTH]: 'Həm şəhərdaxili, həm də şəhərlərarası daşıma edirəm',
};

export function isCargoTransportServiceType(title?: string | null): title is CargoTransportServiceType {
  return Boolean(
    title && (CARGO_TRANSPORT_SERVICE_TYPES as readonly string[]).includes(title),
  );
}

export function isEvakuatorServiceType(title?: string | null): boolean {
  return title === EVAKUATOR_SERVICE_TYPE;
}

/** Yükdaşıma növü seçildikdə maşın ölçüləri, marşrut və şəkillər tələb olunur */
export function requiresVehicleDetails(serviceTitle?: string | null): boolean {
  return isCargoTransportServiceType(serviceTitle);
}

/** Yükdaşıma və Evakuator — daşıma marşrutu məcburidir */
export function requiresCargoRouteScope(serviceTitle?: string | null): boolean {
  return isCargoTransportServiceType(serviceTitle) || isEvakuatorServiceType(serviceTitle);
}

export function formatVehicleDimensions(
  lengthM?: number | null,
  widthM?: number | null,
  heightM?: number | null,
): string | undefined {
  if (lengthM == null || widthM == null || heightM == null) return undefined;
  return `${formatDimension(lengthM)} × ${formatDimension(widthM)} × ${formatDimension(heightM)} m`;
}

export function formatCargoRouteScope(scope?: string | null): string | undefined {
  if (!scope) return undefined;
  if ((CARGO_ROUTE_SCOPE_VALUES as readonly string[]).includes(scope)) {
    return CARGO_ROUTE_SCOPE_LABELS[scope as CargoRouteScopeValue];
  }
  return undefined;
}

function formatDimension(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100);
}
