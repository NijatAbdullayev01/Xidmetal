-- Müştəri qəbul olunmuş təcili sifarişdə başqa xidmət verən axtara bilər.
ALTER TYPE "DispatchOfferStatus" ADD VALUE IF NOT EXISTS 'SKIPPED';

ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "dispatch_window_started_at" TIMESTAMP(3);
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "dispatch_skip_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "dispatch_prefs" JSONB;
