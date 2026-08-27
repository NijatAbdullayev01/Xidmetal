import { createHash } from 'node:crypto';

export interface ServiceRevisionListing {
  title: string;
  description: string;
  price: { toString(): string } | number;
  priceUnit: string;
  location: string | null;
  isRemote: boolean;
  serviceVenue: string | null;
  vehicleLength: number | null;
  vehicleWidth: number | null;
  vehicleHeight: number | null;
  cargoRouteScope: string | null;
  categoryId: string;
  imageUrls: readonly string[];
}

function normalizePrice(price: { toString(): string } | number): string {
  const n = typeof price === 'number' ? price : Number(price.toString());
  if (!Number.isFinite(n)) return '0.00';
  return n.toFixed(2);
}

function normalizeScalar(value: number | null | undefined): string {
  if (value == null) return '';
  return String(value);
}

export function listingFromService(
  service: Omit<ServiceRevisionListing, 'imageUrls'>,
  imageUrls: readonly string[],
): ServiceRevisionListing {
  return { ...service, imageUrls };
}

/** Admin düzəliş istəyəndəki və sonrakı məzmunu müqayisə etmək üçün sabit barmaq izi */
export function hashServiceRevisionListing(listing: ServiceRevisionListing): string {
  const payload = [
    listing.title.trim(),
    listing.description.trim(),
    normalizePrice(listing.price),
    listing.priceUnit,
    listing.location?.trim() ?? '',
    listing.isRemote ? '1' : '0',
    listing.serviceVenue ?? '',
    normalizeScalar(listing.vehicleLength),
    normalizeScalar(listing.vehicleWidth),
    normalizeScalar(listing.vehicleHeight),
    listing.cargoRouteScope ?? '',
    listing.categoryId,
    listing.imageUrls.join('\n'),
  ].join('\0');
  return createHash('sha256').update(payload).digest('hex');
}

export function hasAppliedServiceRevision(
  status: string,
  revisionEditedAt: Date | null | undefined,
): boolean {
  return status === 'NEEDS_REVISION' && revisionEditedAt != null;
}
