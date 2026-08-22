-- Telefon təsdiqi, KYC sənədləri, admin audit, contact inbox, chat şəkli

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone_verified_at" TIMESTAMP(3);

ALTER TYPE "EmailVerificationPurpose" ADD VALUE IF NOT EXISTS 'PHONE_VERIFY';

ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "image_url" TEXT;

CREATE TYPE "KycDocumentType" AS ENUM ('ID_FRONT', 'ID_BACK', 'SELFIE');
CREATE TYPE "KycDocumentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "provider_kyc_documents" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "KycDocumentType" NOT NULL,
    "url" TEXT NOT NULL,
    "status" "KycDocumentStatus" NOT NULL DEFAULT 'PENDING',
    "admin_note" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provider_kyc_documents_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "provider_kyc_documents_user_id_status_idx" ON "provider_kyc_documents"("user_id", "status");

ALTER TABLE "provider_kyc_documents"
  ADD CONSTRAINT "provider_kyc_documents_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "admin_audit_logs" (
    "id" TEXT NOT NULL,
    "admin_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT,
    "meta" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "admin_audit_logs_created_at_idx" ON "admin_audit_logs"("created_at");
CREATE INDEX "admin_audit_logs_admin_id_created_at_idx" ON "admin_audit_logs"("admin_id", "created_at");

ALTER TABLE "admin_audit_logs"
  ADD CONSTRAINT "admin_audit_logs_admin_id_fkey"
  FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "contact_messages" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_messages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "contact_messages_is_read_created_at_idx" ON "contact_messages"("is_read", "created_at");
