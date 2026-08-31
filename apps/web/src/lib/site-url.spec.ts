import { describe, expect, it } from 'vitest';
import { getServerApiBaseUrl, getSiteUrl, resolveSiteUrl } from './site-url';

describe('getSiteUrl', () => {
  it('trailing slash silir', () => {
    const prev = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = 'https://xidmetal.com/';
    expect(getSiteUrl()).toBe('https://xidmetal.com');
    process.env.NEXT_PUBLIC_APP_URL = prev;
  });
});

describe('resolveSiteUrl', () => {
  it('production-da localhost əvəzinə kanonik host qoyur', () => {
    expect(resolveSiteUrl('http://localhost:3020', 'production')).toBe(
      'https://xidmetal.com',
    );
    expect(resolveSiteUrl(undefined, 'production')).toBe('https://xidmetal.com');
    expect(resolveSiteUrl('https://xidmetal.com/', 'production')).toBe(
      'https://xidmetal.com',
    );
  });
});

describe('getServerApiBaseUrl', () => {
  it('INTERNAL_API_URL-ə public URL-dən üstünlük verir', () => {
    const prevInternal = process.env.INTERNAL_API_URL;
    const prevApi = process.env.API_URL;
    const prevPublic = process.env.NEXT_PUBLIC_API_URL;
    process.env.INTERNAL_API_URL = 'http://api:4000';
    process.env.API_URL = 'http://ignored:4000';
    process.env.NEXT_PUBLIC_API_URL = 'https://xidmetal.com';
    expect(getServerApiBaseUrl()).toBe('http://api:4000');
    process.env.INTERNAL_API_URL = prevInternal;
    process.env.API_URL = prevApi;
    process.env.NEXT_PUBLIC_API_URL = prevPublic;
  });
});
