-- Düzəliş tələbindən sonra yoxlamaya göndərmək üçün məzmun dəyişikliyi izi
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "revision_baseline_hash" TEXT;
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "revision_edited_at" TIMESTAMP(3);
