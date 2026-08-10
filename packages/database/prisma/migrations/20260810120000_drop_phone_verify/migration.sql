-- Telefon SMS OTP təsdiqi ləğv olunur: sütun + PHONE_VERIFY kodları silinir.

DELETE FROM "email_verification_codes" WHERE "purpose" = 'PHONE_VERIFY';

ALTER TABLE "users" DROP COLUMN IF EXISTS "phone_verified_at";

-- PostgreSQL enum dəyərini silmək üçün tipi yenidən yaradırıq
CREATE TYPE "EmailVerificationPurpose_new" AS ENUM ('EMAIL_CHANGE', 'SIGNUP_VERIFY', 'PASSWORD_RESET');

ALTER TABLE "email_verification_codes"
  ALTER COLUMN "purpose" DROP DEFAULT,
  ALTER COLUMN "purpose" TYPE "EmailVerificationPurpose_new"
    USING ("purpose"::text::"EmailVerificationPurpose_new");

ALTER TABLE "email_verification_codes"
  ALTER COLUMN "purpose" SET DEFAULT 'EMAIL_CHANGE'::"EmailVerificationPurpose_new";

DROP TYPE "EmailVerificationPurpose";

ALTER TYPE "EmailVerificationPurpose_new" RENAME TO "EmailVerificationPurpose";
