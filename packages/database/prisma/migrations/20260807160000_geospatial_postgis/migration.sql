-- Faza 2: PostGIS + provider mövqe/availability + booking dest/origin coords
CREATE EXTENSION IF NOT EXISTS postgis;

DO $$ BEGIN
  CREATE TYPE "ProviderAvailability" AS ENUM ('OFFLINE', 'ONLINE', 'BUSY');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "provider_profiles"
  ADD COLUMN IF NOT EXISTS "availability" "ProviderAvailability" NOT NULL DEFAULT 'OFFLINE';
ALTER TABLE "provider_profiles"
  ADD COLUMN IF NOT EXISTS "last_lat" DOUBLE PRECISION;
ALTER TABLE "provider_profiles"
  ADD COLUMN IF NOT EXISTS "last_lng" DOUBLE PRECISION;
ALTER TABLE "provider_profiles"
  ADD COLUMN IF NOT EXISTS "last_heading" DOUBLE PRECISION;
ALTER TABLE "provider_profiles"
  ADD COLUMN IF NOT EXISTS "location_updated_at" TIMESTAMP(3);
ALTER TABLE "provider_profiles"
  ADD COLUMN IF NOT EXISTS "last_location" geography(Point, 4326);

CREATE INDEX IF NOT EXISTS "provider_profiles_availability_idx"
  ON "provider_profiles"("availability");

-- GiST index for ST_DWithin proximity queries
CREATE INDEX IF NOT EXISTS "provider_profiles_last_location_gix"
  ON "provider_profiles" USING GIST ("last_location");

ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "dest_lat" DOUBLE PRECISION;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "dest_lng" DOUBLE PRECISION;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "origin_lat" DOUBLE PRECISION;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "origin_lng" DOUBLE PRECISION;
