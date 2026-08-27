import { describe, expect, it } from 'vitest';
import {
  hashServiceRevisionListing,
  hasAppliedServiceRevision,
  listingFromService,
  type ServiceRevisionListing,
} from './service-revision.util';

const baseListing: ServiceRevisionListing = {
  title: 'Xalça təmizliyi',
  description: 'Xalça təmizləyirəm əla edirəm',
  price: 15,
  priceUnit: 'PER_SQM',
  location: 'Bakı',
  isRemote: false,
  serviceVenue: null,
  vehicleLength: null,
  vehicleWidth: null,
  vehicleHeight: null,
  cargoRouteScope: null,
  categoryId: 'cat-1',
  imageUrls: ['https://cdn.example/a.jpg'],
};

describe('hashServiceRevisionListing', () => {
  it('eyni məzmun üçün sabit hash qaytarır', () => {
    expect(hashServiceRevisionListing(baseListing)).toBe(
      hashServiceRevisionListing({ ...baseListing, price: 15.0 }),
    );
  });

  it('təsvir dəyişəndə hash dəyişir', () => {
    const next = hashServiceRevisionListing({
      ...baseListing,
      description: 'Xalça təmizləyirəm, düzəliş etdim',
    });
    expect(next).not.toBe(hashServiceRevisionListing(baseListing));
  });

  it('yalnız boşluq dəyişikliyini məzmun dəyişikliyi saymır', () => {
    expect(
      hashServiceRevisionListing({
        ...baseListing,
        title: '  Xalça təmizliyi  ',
        description: 'Xalça təmizləyirəm əla edirəm  ',
      }),
    ).toBe(hashServiceRevisionListing(baseListing));
  });

  it('şəkil sırası dəyişəndə hash dəyişir', () => {
    expect(
      hashServiceRevisionListing({
        ...baseListing,
        imageUrls: ['https://cdn.example/b.jpg', 'https://cdn.example/a.jpg'],
      }),
    ).not.toBe(
      hashServiceRevisionListing({
        ...baseListing,
        imageUrls: ['https://cdn.example/a.jpg', 'https://cdn.example/b.jpg'],
      }),
    );
  });
});

describe('hasAppliedServiceRevision', () => {
  it('yalnız NEEDS_REVISION + revisionEditedAt olduqda true qaytarır', () => {
    expect(hasAppliedServiceRevision('NEEDS_REVISION', new Date())).toBe(true);
    expect(hasAppliedServiceRevision('NEEDS_REVISION', null)).toBe(false);
    expect(hasAppliedServiceRevision('DRAFT', new Date())).toBe(false);
  });
});

describe('listingFromService', () => {
  it('şəkil URL-lərini listing-ə əlavə edir', () => {
    const { imageUrls, ...fields } = baseListing;
    expect(listingFromService(fields, imageUrls).imageUrls).toEqual(imageUrls);
  });
});
