-- Public xidmət permalink-i. Mövcud sətirlər title + id prefiksi ilə doldurulur.
ALTER TABLE "services" ADD COLUMN "slug" TEXT;

UPDATE "services"
SET "slug" = (
  trim(both '-' FROM regexp_replace(
    translate(
      lower("title"),
      'ƏəIıİiÖöÜüŞşÇçĞğ',
      'eeiiiiioouusscggg'
    ),
    '[^a-z0-9]+',
    '-',
    'g'
  ))
);
UPDATE "services"
SET "slug" = CASE
  WHEN "slug" IS NULL OR "slug" = '' THEN 'xidmet'
  ELSE left("slug", 60)
END;
UPDATE "services"
SET "slug" = trim(both '-' FROM "slug") || '-' || substr(replace("id"::text, '-', ''), 1, 8);

ALTER TABLE "services" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX "services_slug_key" ON "services"("slug");
