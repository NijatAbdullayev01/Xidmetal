import { describe, expect, it } from 'vitest';
import { toDisplayMediaUrl } from '@xidmetal/shared';

describe('toDisplayMediaUrl', () => {
  it('lokal API upload URL-ini same-origin yola çevirir', () => {
    expect(
      toDisplayMediaUrl(
        'http://localhost:4100/uploads/services/x.png?exp=1&sig=abc',
      ),
    ).toBe('/uploads/services/x.png?exp=1&sig=abc');
  });

  it('artıq relative yolu saxlayır', () => {
    expect(toDisplayMediaUrl('/uploads/avatars/a.jpg?exp=2&sig=z')).toBe(
      '/uploads/avatars/a.jpg?exp=2&sig=z',
    );
  });

  it('S3/CDN URL-ini dəyişmir', () => {
    const cdn = 'https://cdn.example.com/services/x.webp';
    expect(toDisplayMediaUrl(cdn)).toBe(cdn);
  });

  it('path traversal cəhdini çevirmir', () => {
    const bad = 'http://localhost:4100/uploads/../secret.png';
    expect(toDisplayMediaUrl(bad)).toBe(bad);
  });
});
