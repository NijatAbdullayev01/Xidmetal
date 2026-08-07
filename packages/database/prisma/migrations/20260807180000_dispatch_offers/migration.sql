-- Faza 4: DispatchOffer — on-demand təklif izləmə

CREATE TYPE "DispatchOfferStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED');

CREATE TABLE "dispatch_offers" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "status" "DispatchOfferStatus" NOT NULL DEFAULT 'PENDING',
    "distance_m" DOUBLE PRECISION,
    "score" DOUBLE PRECISION,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responded_at" TIMESTAMP(3),

    CONSTRAINT "dispatch_offers_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "dispatch_offers_booking_id_idx" ON "dispatch_offers"("booking_id");
CREATE INDEX "dispatch_offers_provider_id_status_idx" ON "dispatch_offers"("provider_id", "status");
CREATE INDEX "dispatch_offers_status_expires_at_idx" ON "dispatch_offers"("status", "expires_at");

ALTER TABLE "dispatch_offers" ADD CONSTRAINT "dispatch_offers_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dispatch_offers" ADD CONSTRAINT "dispatch_offers_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
