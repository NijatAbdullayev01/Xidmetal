import { describe, expect, it } from 'vitest';
import { CaptchaService } from './captcha.service';

describe('CaptchaService', () => {
  function makeService(secret: string | undefined) {
    const config = {
      get: (key: string) => (key === 'TURNSTILE_SECRET_KEY' ? secret : undefined),
    };
    return new CaptchaService(config as never);
  }

  it('skips when secret missing', async () => {
    const svc = makeService(undefined);
    await expect(svc.assertValid(undefined)).resolves.toBeUndefined();
    expect(svc.isEnabled()).toBe(false);
  });

  it('requires token when secret set', async () => {
    const svc = makeService('test-secret');
    expect(svc.isEnabled()).toBe(true);
    await expect(svc.assertValid(undefined)).rejects.toThrow(
      /Təhlükəsizlik yoxlaması tələb olunur/,
    );
  });
});
