-- AlterTable
ALTER TABLE "users" ADD COLUMN "phone_verified_at" TIMESTAMP(3);

-- AlterEnum
ALTER TYPE "EmailVerificationPurpose" ADD VALUE 'PHONE_VERIFY';
