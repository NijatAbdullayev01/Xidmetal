import { describe, expect, it } from 'vitest';
import { createPrivateUploadsGuard } from './private-uploads.middleware';
import { signPrivateMediaUrl } from '../storage/signed-media';

describe('createPrivateUploadsGuard', () => {
  const secret = 'test-media-signing-secret-32chars!!';

  function mockRes() {
    const res = {
      statusCode: 200,
      body: null as unknown,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(payload: unknown) {
        this.body = payload;
        return this;
      },
    };
    return res;
  }

  it('services/ imzasız sorğunu 403 edir', () => {
    const guard = createPrivateUploadsGuard(secret);
    const res = mockRes();
    let nextCalled = false;
    guard(
      { path: '/services/x.jpg', query: {} } as never,
      res as never,
      () => {
        nextCalled = true;
      },
    );
    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(403);
  });

  it('imzalı services/ keçir', () => {
    const signed = signPrivateMediaUrl('/uploads/services/x.jpg', secret, 60);
    const url = new URL(signed, 'http://localhost');
    const guard = createPrivateUploadsGuard(secret);
    const res = mockRes();
    let nextCalled = false;
    guard(
      {
        path: '/services/x.jpg',
        query: {
          exp: url.searchParams.get('exp') ?? undefined,
          sig: url.searchParams.get('sig') ?? undefined,
        },
      } as never,
      res as never,
      () => {
        nextCalled = true;
      },
    );
    expect(nextCalled).toBe(true);
    expect(res.statusCode).toBe(200);
  });

  it('path traversal rədd edilir', () => {
    const guard = createPrivateUploadsGuard(secret);
    const res = mockRes();
    let nextCalled = false;
    guard(
      { path: '/bookings/../services/x.jpg', query: {} } as never,
      res as never,
      () => {
        nextCalled = true;
      },
    );
    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(400);
  });
});
