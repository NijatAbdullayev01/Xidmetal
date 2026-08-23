import { BadRequestException } from '@nestjs/common';
import {
  COMPANY_NAME_MAX_LENGTH,
  ProviderAccountType,
  UserRole,
} from '@xidmetal/shared';

export function resolveProviderProfileCreate(dto: {
  role?: UserRole;
  providerAccountType?: ProviderAccountType;
  companyName?: string;
}): { accountType: ProviderAccountType; companyName: string | null } | null {
  if (dto.role !== UserRole.PROVIDER) {
    return null;
  }

  const accountType = dto.providerAccountType ?? ProviderAccountType.INDIVIDUAL;
  if (accountType !== ProviderAccountType.COMPANY) {
    return { accountType: ProviderAccountType.INDIVIDUAL, companyName: null };
  }

  const companyName = dto.companyName?.trim() ?? '';
  if (companyName.length < 2) {
    throw new BadRequestException('Şirkət adı tələb olunur');
  }
  if (companyName.length > COMPANY_NAME_MAX_LENGTH) {
    throw new BadRequestException(
      `Şirkət adı maksimum ${COMPANY_NAME_MAX_LENGTH} simvol ola bilər`,
    );
  }

  return { accountType: ProviderAccountType.COMPANY, companyName };
}

export function resolveRegisterPersonNames(dto: {
  role?: UserRole;
  providerAccountType?: ProviderAccountType;
  companyName?: string;
  firstName?: string;
  lastName?: string;
}): { firstName: string; lastName: string } {
  const firstName = dto.firstName?.trim() ?? '';
  const lastName = dto.lastName?.trim() ?? '';
  if (
    dto.role === UserRole.PROVIDER &&
    dto.providerAccountType === ProviderAccountType.COMPANY
  ) {
    const companyName = dto.companyName?.trim() ?? '';
    return {
      firstName: firstName || companyName,
      lastName,
    };
  }
  return { firstName, lastName };
}
