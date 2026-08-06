-- Refresh token client audience
ALTER TABLE "refresh_tokens" ADD COLUMN "client_app" TEXT;

-- Mövcud sessiyalar: rolə görə təxmin (ADMIN → admin, digərləri → marketplace)
UPDATE "refresh_tokens" rt
SET "client_app" = CASE
  WHEN u."role" = 'ADMIN' THEN 'admin'
  ELSE 'marketplace'
END
FROM "users" u
WHERE u."id" = rt."user_id" AND rt."client_app" IS NULL;

ALTER TABLE "refresh_tokens" ALTER COLUMN "client_app" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- Booking ləğv metadata
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "cancel_reason" VARCHAR(500);
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "cancelled_by" VARCHAR(20);
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "cancelled_at" TIMESTAMP(3);

-- IN_PROGRESS bildirişi
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'BOOKING_IN_PROGRESS';
