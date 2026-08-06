import { describe, expect, it } from 'vitest';
import { detectImageMime } from './image-mime';

describe('detectImageMime', () => {
  it('JPEG magic byte-larını tanıyır', () => {
    const buf = Buffer.from([0xff, 0xd8, 0xff, 0xe0, ...Buffer.alloc(8)]);
    expect(detectImageMime(buf)).toBe('image/jpeg');
  });

  it('PNG magic byte-larını tanıyır', () => {
    const buf = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0,
    ]);
    expect(detectImageMime(buf)).toBe('image/png');
  });

  it('WEBP magic byte-larını tanıyır', () => {
    const buf = Buffer.alloc(12);
    buf.write('RIFF', 0);
    buf.write('WEBP', 8);
    expect(detectImageMime(buf)).toBe('image/webp');
  });

  it('naməlum faylı rədd edir', () => {
    expect(detectImageMime(Buffer.from('not-an-image!!'))).toBeNull();
    expect(detectImageMime(Buffer.alloc(4))).toBeNull();
  });
});
