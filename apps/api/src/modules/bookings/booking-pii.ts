import { matchCatalogLocationFromText } from '@xidmetal/shared';
import { coarsenPublicCoordinate } from '../geo/geo-query';

export type OfferBookingPii = {
  address: string | null;
  destLat: number | null;
  destLng: number | null;
  originLat: number | null;
  originLng: number | null;
  notes: string | null;
  customerFirstName: string;
  customerLastName: string;
};

/**
 * Qəbuldan əvvəl dispatch təklifi — tam ünvan/qapı/GPS/notes yox.
 * Yalnız şəhər/rayon + ~110 m grid.
 */
export function redactBookingPiiForOffer(input: OfferBookingPii): {
  address: string | null;
  destLat: number | null;
  destLng: number | null;
  originLat: null;
  originLng: null;
  notes: null;
  customerName: string;
} {
  const city =
    matchCatalogLocationFromText(input.address ?? '') ??
    input.address?.split(',')[0]?.trim() ??
    null;

  return {
    address: city,
    destLat:
      input.destLat != null ? coarsenPublicCoordinate(input.destLat) : null,
    destLng:
      input.destLng != null ? coarsenPublicCoordinate(input.destLng) : null,
    originLat: null,
    originLng: null,
    notes: null,
    customerName: input.customerFirstName.trim() || 'Müştəri',
  };
}
