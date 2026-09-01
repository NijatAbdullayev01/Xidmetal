import { describe, expect, it } from 'vitest';
import { isPublicGetRequest } from './api-fetch-policy';

describe('isPublicGetRequest', () => {
  it('token-siz GET-i public sayır', () => {
    expect(isPublicGetRequest(undefined, undefined)).toBe(true);
    expect(isPublicGetRequest('GET', undefined)).toBe(true);
    expect(isPublicGetRequest('get', undefined)).toBe(true);
  });

  it('sessiya tokeni olanda cookie göndərilməlidir', () => {
    expect(isPublicGetRequest('GET', 'session')).toBe(false);
  });

  it('POST/PATCH/DELETE cookie tələb edir (Set-Cookie / auth)', () => {
    expect(isPublicGetRequest('POST', undefined)).toBe(false);
    expect(isPublicGetRequest('PATCH', 'session')).toBe(false);
  });
});
