import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { ProviderAccountType, UserRole } from '@xidmetal/shared';
import { resolveProviderProfileCreate, resolveRegisterPersonNames } from './provider-account';

describe('resolveProviderProfileCreate', () => {
  it('müştəri üçün profil yaratmır', () => {
    expect(
      resolveProviderProfileCreate({
        role: UserRole.CUSTOMER,
        providerAccountType: ProviderAccountType.COMPANY,
        companyName: 'Xidmətal MMC',
      }),
    ).toBeNull();
  });

  it('xidmət verən üçün fərdi qeydiyyatı default edir', () => {
    expect(resolveProviderProfileCreate({ role: UserRole.PROVIDER })).toEqual({
      accountType: ProviderAccountType.INDIVIDUAL,
      companyName: null,
    });
  });

  it('şirkət üçün adı saxlayır', () => {
    expect(
      resolveProviderProfileCreate({
        role: UserRole.PROVIDER,
        providerAccountType: ProviderAccountType.COMPANY,
        companyName: '  Xidmətal MMC  ',
      }),
    ).toEqual({
      accountType: ProviderAccountType.COMPANY,
      companyName: 'Xidmətal MMC',
    });
  });

  it('şirkət adı olmadan BadRequestException atır', () => {
    expect(() =>
      resolveProviderProfileCreate({
        role: UserRole.PROVIDER,
        providerAccountType: ProviderAccountType.COMPANY,
        companyName: ' ',
      }),
    ).toThrow(BadRequestException);
  });
});

describe('resolveRegisterPersonNames', () => {
  it('şirkət qeydiyyatında adı şirkət adından götürür', () => {
    expect(
      resolveRegisterPersonNames({
        role: UserRole.PROVIDER,
        providerAccountType: ProviderAccountType.COMPANY,
        companyName: '  Xidmətal MMC  ',
      }),
    ).toEqual({
      firstName: 'Xidmətal MMC',
      lastName: '',
    });
  });

  it('fərdi qeydiyyatda ad soyadı saxlayır', () => {
    expect(
      resolveRegisterPersonNames({
        role: UserRole.PROVIDER,
        providerAccountType: ProviderAccountType.INDIVIDUAL,
        firstName: 'Əli',
        lastName: 'Məmmədov',
      }),
    ).toEqual({
      firstName: 'Əli',
      lastName: 'Məmmədov',
    });
  });
});
