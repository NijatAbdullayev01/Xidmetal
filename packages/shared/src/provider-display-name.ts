import { ProviderAccountType } from './enums';

export function formatProviderDisplayName(provider: {
  firstName: string;
  lastName: string;
  providerProfile?: {
    accountType?: ProviderAccountType | string | null;
    companyName?: string | null;
  } | null;
}): string {
  const companyName = provider.providerProfile?.companyName?.trim();
  if (
    provider.providerProfile?.accountType === ProviderAccountType.COMPANY &&
    companyName
  ) {
    return companyName;
  }
  return `${provider.firstName} ${provider.lastName}`.trim();
}
