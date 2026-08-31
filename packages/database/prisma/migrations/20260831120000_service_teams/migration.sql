-- Şirkət xidmətləri üçün paralel tutum (komanda / ekipaj)

CREATE TABLE "service_teams" (
    "id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_teams_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "service_teams_service_id_name_key" ON "service_teams"("service_id", "name");

CREATE INDEX "service_teams_service_id_is_active_idx" ON "service_teams"("service_id", "is_active");

ALTER TABLE "service_teams"
  ADD CONSTRAINT "service_teams_service_id_fkey"
  FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "bookings" ADD COLUMN "team_id" TEXT;

CREATE INDEX "bookings_team_id_idx" ON "bookings"("team_id");

ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_team_id_fkey"
  FOREIGN KEY ("team_id") REFERENCES "service_teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Mövcud xidmətlərə 1 default komanda (geriyə uyğun tutum = 1)
INSERT INTO "service_teams" ("id", "service_id", "name", "sort_order", "is_default", "is_active", "created_at", "updated_at")
SELECT gen_random_uuid(), s."id", 'Komanda 1', 0, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "services" s
WHERE NOT EXISTS (
  SELECT 1 FROM "service_teams" st WHERE st."service_id" = s."id"
);
