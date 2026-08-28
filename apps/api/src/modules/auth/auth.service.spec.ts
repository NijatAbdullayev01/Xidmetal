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
        { isAvailable: () => false, incr: vi.fn(), expire: vi.fn(), del: vi.fn(), get: vi.fn() } as never,
        { revokeAll: vi.fn(), publish: vi.fn() } as never,
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
    ).rejects.toThrow('Bu e-poçt və ya telefon artıq qeydiyyatdadır');
  });
});

describe('AuthService.forgotPassword', () => {
  function buildForgotService(user: unknown) {
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue(user),
      },
      $transaction: vi.fn().mockResolvedValue([]),
      emailVerificationCode: {
        deleteMany: vi.fn(),
        create: vi.fn(),
      },
    };
    const captcha = { assertValid: vi.fn().mockResolvedValue(undefined) };
    const mail = {
      sendPasswordResetCode: vi.fn().mockResolvedValue({
        delivered: true,
        previewCode: '12345678',
      }),
    };
    const service = new AuthService(
      prisma as never,
      {} as never,
      { get: vi.fn() } as never,
      mail as never,
      captcha as never,
      {} as never,
      {
        isAvailable: false,
        incr: vi.fn(),
        expire: vi.fn(),
        del: vi.fn(),
        get: vi.fn(),
      } as never,
      { revokeAll: vi.fn(), publish: vi.fn() } as never,
    );
    return { service, mail, prisma };
  }

  it('mövcud və mövcud olmayan email üçün eyni JSON forması qaytarır', async () => {
    const existing = buildForgotService({
      id: 'u1',
      email: 'ali@example.com',
      isActive: true,
      deletedAt: null,
    });
    const missing = buildForgotService(null);

    const withUser = await existing.service.forgotPassword('ali@example.com', 't');
    const withoutUser = await missing.service.forgotPassword('yox@example.com', 't');

    expect(withUser).toEqual({ message: expect.any(String) });
    expect(withoutUser).toEqual({ message: withUser.message });
    expect(withUser).not.toHaveProperty('mailDelivered');
    expect(withoutUser).not.toHaveProperty('mailDelivered');
    expect(withUser).not.toHaveProperty('previewCode');
  });
});
