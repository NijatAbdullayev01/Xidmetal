-- Soft-delete + password versioning; safer FK; booking/review indexes
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_changed_at" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "users_deleted_at_idx" ON "users"("deleted_at");

CREATE INDEX IF NOT EXISTS "bookings_service_id_scheduled_at_idx" ON "bookings"("service_id", "scheduled_at");
CREATE INDEX IF NOT EXISTS "bookings_scheduled_at_idx" ON "bookings"("scheduled_at");

CREATE INDEX IF NOT EXISTS "reviews_status_idx" ON "reviews"("status");
CREATE INDEX IF NOT EXISTS "reviews_author_id_idx" ON "reviews"("author_id");

-- Provider hard-delete Cascade → Restrict (xidmətləri gizli silməsin)
ALTER TABLE "services" DROP CONSTRAINT IF EXISTS "services_provider_id_fkey";
ALTER TABLE "services" ADD CONSTRAINT "services_provider_id_fkey"
  FOREIGN KEY ("provider_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
