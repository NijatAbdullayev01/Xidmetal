-- AlterTable
ALTER TABLE "email_verification_codes" ADD COLUMN "attempt_count" INTEGER NOT NULL DEFAULT 0;
