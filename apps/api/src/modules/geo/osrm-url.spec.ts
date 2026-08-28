import { describe, expect, it } from 'vitest';
import { resolveOsrmBaseUrl } from './osrm-url';

describe('resolveOsrmBaseUrl', () => {
  it('default public OSRM hostunu qəbul edir', () => {
    expect(resolveOsrmBaseUrl({})).toBe('https://router.project-osrm.org');
  });

  it('allowlist-dən kənar hostu rədd edir', () => {
    expect(
      resolveOsrmBaseUrl({
        configured: 'https://169.254.169.254',
        allowedHosts: 'router.project-osrm.org',
      }),
    ).toBeNull();
  });

  it('file protocol-u rədd edir', () => {
    expect(
      resolveOsrmBaseUrl({
        configured: 'file:///etc/passwd',
        allowedHosts: 'etc',
      }),
    ).toBeNull();
  });

  it('öz hostunu allowlist ilə qəbul edir (docker http)', () => {
    expect(
      resolveOsrmBaseUrl({
        configured: 'http://osrm:5000',
        allowedHosts: 'osrm,router.project-osrm.org',
      }),
    ).toBe('http://osrm:5000');
  });
});
