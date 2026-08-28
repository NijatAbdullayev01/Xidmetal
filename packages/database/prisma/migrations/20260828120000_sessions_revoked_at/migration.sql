-- logout-all və admin deaktivasiya: access JWT-ləri refresh silinəndən sonra da keçərsiz olsun
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "sessions_revoked_at" TIMESTAMP(3);
