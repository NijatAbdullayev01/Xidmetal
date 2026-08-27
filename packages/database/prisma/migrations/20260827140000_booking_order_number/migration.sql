-- İstifadəçi üçün dəyişməz sifariş nömrəsi (XM-YY-NNNNNN).
-- Ardıcıllıq PostgreSQL sequence-dir: eyni anda yaradılan sifarişlər toqquşmur;
-- rollback olsa belə nömrə təkrar istifadə olunmur (boşluq normaldır).

CREATE SEQUENCE IF NOT EXISTS booking_order_number_seq;

CREATE OR REPLACE FUNCTION next_booking_order_number()
RETURNS VARCHAR(20)
LANGUAGE plpgsql
AS $$
DECLARE
  seq bigint;
  yy text;
BEGIN
  seq := nextval('booking_order_number_seq');
  yy := to_char((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Baku'), 'YY');
  RETURN 'XM-' || yy || '-' || lpad(seq::text, 6, '0');
END;
$$;

ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "order_number" VARCHAR(20);

WITH numbered AS (
  SELECT id, nextval('booking_order_number_seq') AS seq
  FROM "bookings"
  WHERE "order_number" IS NULL
  ORDER BY "created_at" ASC, id ASC
)
UPDATE "bookings" AS b
SET "order_number" = 'XM-' || to_char((b."created_at" AT TIME ZONE 'Asia/Baku'), 'YY')
  || '-' || lpad(numbered.seq::text, 6, '0')
FROM numbered
WHERE b.id = numbered.id
  AND b."order_number" IS NULL;

ALTER TABLE "bookings" ALTER COLUMN "order_number" SET DEFAULT next_booking_order_number();
ALTER TABLE "bookings" ALTER COLUMN "order_number" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "bookings_order_number_key" ON "bookings"("order_number");

ALTER TABLE "bookings" DROP CONSTRAINT IF EXISTS "bookings_order_number_format_chk";
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_order_number_format_chk"
  CHECK ("order_number" ~ '^XM-[0-9]{2}-[0-9]{6,8}$');

CREATE OR REPLACE FUNCTION bookings_assign_order_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := next_booking_order_number();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bookings_assign_order_number ON "bookings";
CREATE TRIGGER trg_bookings_assign_order_number
BEFORE INSERT ON "bookings"
FOR EACH ROW
EXECUTE FUNCTION bookings_assign_order_number();
