import { describe, expect, it } from 'vitest';
import { ProviderAccountType, UserRole } from '@xidmetal/shared';
import { registerFormSchema } from './register-schema';

const base = {
  firstName: 'Əli',
  lastName: 'Məmmədov',
  email: 'ali@example.com',
  phone: '+994501234567',
  password: 'Password1',
  confirmPassword: 'Password1',
};

describe('registerFormSchema provider account type', () => {
  it('fərdi xidmət verəni şirkət adı olmadan qəbul edir', () => {
    const result = registerFormSchema.safeParse({
      ...base,
      role: UserRole.PROVIDER,
      providerAccountType: ProviderAccountType.INDIVIDUAL,
    });
    expect(result.success).toBe(true);
  });

  it('şirkət seçəndə adı tələb edir', () => {
    const result = registerFormSchema.safeParse({
      ...base,
      role: UserRole.PROVIDER,
      providerAccountType: ProviderAccountType.COMPANY,
      companyName: '',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path[0] === 'companyName')).toBe(true);
    }
  });

  it('şirkət adı ilə keçir', () => {
    const result = registerFormSchema.safeParse({
      ...base,
      role: UserRole.PROVIDER,
      providerAccountType: ProviderAccountType.COMPANY,
      companyName: 'Xidmətal MMC',
    });
    expect(result.success).toBe(true);
  });

  it('şirkət seçəndə ad soyad tələb etmir', () => {
    const result = registerFormSchema.safeParse({
      email: 'sirket@example.com',
      phone: '+994501234567',
      password: 'Password1',
      confirmPassword: 'Password1',
      role: UserRole.PROVIDER,
      providerAccountType: ProviderAccountType.COMPANY,
      companyName: 'Xidmətal MMC',
    });
    expect(result.success).toBe(true);
  });

  it('fərdi xidmət verən üçün ad soyad tələb edir', () => {
    const result = registerFormSchema.safeParse({
      email: 'ali@example.com',
      phone: '+994501234567',
      password: 'Password1',
      confirmPassword: 'Password1',
      role: UserRole.PROVIDER,
      providerAccountType: ProviderAccountType.INDIVIDUAL,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((issue) => issue.path[0]);
      expect(paths).toContain('firstName');
      expect(paths).toContain('lastName');
    }
  });

  it('telefon nömrəsini tələb edir', () => {
    const result = registerFormSchema.safeParse({
      ...base,
      phone: '',
      role: UserRole.CUSTOMER,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path[0] === 'phone')).toBe(true);
    }
  });
});
