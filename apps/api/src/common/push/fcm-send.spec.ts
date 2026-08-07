import { afterEach, describe, expect, it, vi } from 'vitest';
import { sendFcmLegacy, clearFcmAccessTokenCache } from './fcm-send';

describe('sendFcmLegacy', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    clearFcmAccessTokenCache();
  });

  it('uğurlu cavabı ok kimi qaytarır', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: 1, failure: 0, results: [{}] }),
      }),
    );

    const result = await sendFcmLegacy({
      serverKey: 'test-key',
      token: 'device-token',
      title: 'Test',
      body: 'Body',
    });

    expect(result.ok).toBe(true);
    expect(fetch).toHaveBeenCalledWith(
      'https://fcm.googleapis.com/fcm/send',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('NotRegistered xətasını errorCode ilə qaytarır', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          success: 0,
          failure: 1,
          results: [{ error: 'NotRegistered' }],
        }),
      }),
    );

    const result = await sendFcmLegacy({
      serverKey: 'test-key',
      token: 'bad-token',
      title: 'Test',
      body: 'Body',
    });

    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe('NotRegistered');
  });
});
