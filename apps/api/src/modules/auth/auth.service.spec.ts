import { ConflictException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { UserRole } from '@xidmetal/shared';
import { AuthService } from './auth.service';

describe('AuthService.register', () => {
  function buildService(prismaOverrides: Record<string, unknown> = {}) {
    const prisma = {
      user: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn(),
      },
      ...prismaOverrides,
    };
    const captcha = { assertValid: vi.fn().mockResolvedValue(undefined) };
    const mail = {
      sendEmailVerification: vi.fn().mockResolvedValue({ previewCode: null }),
    };
    const jwt = { signAsync: vi.fn() };
    const config = { get: vi.fn() };
    const storage = { toReadableMediaUrl: vi.fn() };

    return {
      service: new AuthService(
        prisma as never,
        jwt as never,
        config as never,
        mail as never,
        captcha as never,
        storage as never,
      ),
      prisma,
      captcha,
    };
  }

  it('mövcud e-poçt üçün ConflictException atır', async () => {
    const { service, prisma, captcha } = buildService({
      user: {
        findFirst: vi.fn().mockResolvedValue({
          email: 'ali@example.com',
          phone: null,
        }),
        create: vi.fn(),
      },
    });

    await expect(
      service.register({
        email: 'ali@example.com',
        password: 'Password1!',
        firstName: 'Ali',
        lastName: 'M',
        phone: '+994501111111',
        role: UserRole.CUSTOMER,
        captchaToken: 'token',
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(captcha.assertValid).toHaveBeenCalled();
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('mövcud telefon üçün ConflictException atır', async () => {
    const { service } = buildService({
      user: {
        findFirst: vi.fn().mockResolvedValue({
          email: 'other@example.com',
          phone: '+994501234567',
        }),
        create: vi.fn(),
      },
    });

    await expect(
      service.register({
        email: 'new@example.com',
        password: 'Password1!',
        firstName: 'Ali',
        lastName: 'M',
        phone: '+994501234567',
        role: UserRole.CUSTOMER,
        captchaToken: 'token',
      }),
    ).rejects.toThrow('Bu telefon nömrəsi artıq qeydiyyatdan keçib');
  });
});
