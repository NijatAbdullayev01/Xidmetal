import { describe, expect, it } from 'vitest';
import { GET } from './route';

describe('Google Search Console verification', () => {
  it('HTML token-u 200 ilə qaytarır', async () => {
    const res = GET();
    expect(res.status).toBe(200);
    await expect(res.text()).resolves.toBe(
      'google-site-verification: google3ca31a5fa705ff79.html',
    );
    expect(res.headers.get('content-type')).toMatch(/text\/html/);
  });
});
