import { ServiceVenue } from './enums';

export const BEAUTY_CATEGORY_SLUG = 'gozellik';

export const SERVICE_VENUE_VALUES = [
  ServiceVenue.AT_LOCATION,
  ServiceVenue.AT_SALON,
] as const;

export type ServiceVenueValue = (typeof SERVICE_VENUE_VALUES)[number];

export const SERVICE_VENUE_LABELS: Record<ServiceVenueValue, string> = {
  [ServiceVenue.AT_LOCATION]: 'Ünvanda',
  [ServiceVenue.AT_SALON]: 'Salonda',
};

export const SERVICE_VENUE_DESCRIPTIONS: Record<ServiceVenueValue, string> = {
  [ServiceVenue.AT_LOCATION]: 'Müştərinin ünvanında xidmət göstərirəm',
  [ServiceVenue.AT_SALON]: 'Öz salonumda xidmət göstərirəm',
};

export function requiresServiceVenue(categorySlug?: string): boolean {
  return categorySlug === BEAUTY_CATEGORY_SLUG;
}
