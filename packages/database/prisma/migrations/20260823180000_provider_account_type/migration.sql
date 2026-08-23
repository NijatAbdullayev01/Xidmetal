-- Xidmət verən: fərdi və ya şirkət qeydiyyatı

CREATE TYPE "ProviderAccountType" AS ENUM ('INDIVIDUAL', 'COMPANY');

ALTER TABLE "provider_profiles"
  ADD COLUMN "account_type" "ProviderAccountType" NOT NULL DEFAULT 'INDIVIDUAL',
  ADD COLUMN "company_name" TEXT;
