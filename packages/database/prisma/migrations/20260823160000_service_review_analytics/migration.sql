-- Prisma schema-da olan, amma heç bir miqrasiyada yaradılmayan sahələr.
-- GET /services 500: services.review_note / submitted_at / reviewed_at yoxdur.
-- ServiceStatus-da PENDING_REVIEW / NEEDS_REVISION yoxdur.

ALTER TYPE "ServiceStatus" ADD VALUE IF NOT EXISTS 'PENDING_REVIEW';
ALTER TYPE "ServiceStatus" ADD VALUE IF NOT EXISTS 'NEEDS_REVISION';

ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "review_note" TEXT;
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "submitted_at" TIMESTAMP(3);
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "reviewed_at" TIMESTAMP(3);

ALTER TABLE "reviews" ALTER COLUMN "status" SET DEFAULT 'APPROVED';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AnalyticsEventType') THEN
    CREATE TYPE "AnalyticsEventType" AS ENUM ('PAGE_VIEW', 'CLICK', 'HEARTBEAT', 'SESSION_END');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "analytics_sessions" (
    "id" TEXT NOT NULL,
    "anonymous_id" TEXT NOT NULL,
    "user_id" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "duration_ms" INTEGER NOT NULL DEFAULT 0,
    "landing_path" VARCHAR(500),
    "exit_path" VARCHAR(500),
    "referrer" VARCHAR(1000),
    "user_agent" VARCHAR(500),
    "language" VARCHAR(32),
    "screen_width" INTEGER,
    "page_views" INTEGER NOT NULL DEFAULT 0,
    "is_bounce" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analytics_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "analytics_events" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "type" "AnalyticsEventType" NOT NULL,
    "path" VARCHAR(500),
    "name" VARCHAR(200),
    "meta" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "analytics_sessions_anonymous_id_started_at_idx" ON "analytics_sessions"("anonymous_id", "started_at");
CREATE INDEX IF NOT EXISTS "analytics_sessions_started_at_idx" ON "analytics_sessions"("started_at");
CREATE INDEX IF NOT EXISTS "analytics_sessions_last_seen_at_idx" ON "analytics_sessions"("last_seen_at");
CREATE INDEX IF NOT EXISTS "analytics_events_type_created_at_idx" ON "analytics_events"("type", "created_at");
CREATE INDEX IF NOT EXISTS "analytics_events_path_created_at_idx" ON "analytics_events"("path", "created_at");
CREATE INDEX IF NOT EXISTS "analytics_events_name_created_at_idx" ON "analytics_events"("name", "created_at");
CREATE INDEX IF NOT EXISTS "analytics_events_session_id_created_at_idx" ON "analytics_events"("session_id", "created_at");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'analytics_events_session_id_fkey'
  ) THEN
    ALTER TABLE "analytics_events"
      ADD CONSTRAINT "analytics_events_session_id_fkey"
      FOREIGN KEY ("session_id") REFERENCES "analytics_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
