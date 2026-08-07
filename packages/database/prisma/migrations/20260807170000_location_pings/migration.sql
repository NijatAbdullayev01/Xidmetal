-- Faza 3: LocationPing — seçilmiş marşrut nöqtələri (WS sampling)

CREATE TABLE "location_pings" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "heading" DOUBLE PRECISION,
    "speed" DOUBLE PRECISION,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "location_pings_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "location_pings_booking_id_recorded_at_idx" ON "location_pings"("booking_id", "recorded_at");

ALTER TABLE "location_pings" ADD CONSTRAINT "location_pings_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
