import { describe, expect, it } from 'vitest';
import { collectMediaBaseUrls, isAllowedMediaUrl } from './allowed-media-url';

describe('isAllowedMediaUrl', () => {
  const bases = collectMediaBaseUrls({
    storagePublicBaseUrl: 'http://localhost:4000/uploads',
    apiUrl: 'http://localhost:4000',
    s3PublicUrl: 'https://cdn.example.com',
  });

  it('relative /uploads path qəbul edir', () => {
    expect(isAllowedMediaUrl('/uploads/avatars/u1/a.jpg', bases)).toBe(true);
  });

  it('path traversal rədd edir', () => {
    expect(isAllowedMediaUrl('/uploads/../etc/passwd', bases)).toBe(false);
  });

  it('öz API upload host-unu qəbul edir', () => {
    expect(
      isAllowedMediaUrl('http://localhost:4000/uploads/services/u1/x.png', bases),
    ).toBe(true);
  });

  it('S3 public URL qəbul edir', () => {
    expect(isAllowedMediaUrl('https://cdn.example.com/folder/x.webp', bases)).toBe(
      true,
    );
  });

  it('xarici host rədd edir', () => {
    expect(isAllowedMediaUrl('https://evil.example/track.png', bases)).toBe(false);
  });

  it('credentials-li URL rədd edir', () => {
    expect(
      isAllowedMediaUrl('https://user:pass@cdn.example.com/x.png', bases),
    ).toBe(false);
  });
});
