-- Upload orphan tracking + DB-backed typing (multi-instance safe)

CREATE TABLE IF NOT EXISTS "uploaded_objects" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "folder" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "uploaded_objects_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "uploaded_objects_key_key" ON "uploaded_objects"("key");
CREATE INDEX IF NOT EXISTS "uploaded_objects_user_id_created_at_idx" ON "uploaded_objects"("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "uploaded_objects_created_at_idx" ON "uploaded_objects"("created_at");

ALTER TABLE "uploaded_objects"
  DROP CONSTRAINT IF EXISTS "uploaded_objects_user_id_fkey";
ALTER TABLE "uploaded_objects"
  ADD CONSTRAINT "uploaded_objects_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "typing_presences" (
    "conversation_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "typing_presences_pkey" PRIMARY KEY ("conversation_id")
);

CREATE INDEX IF NOT EXISTS "typing_presences_expires_at_idx" ON "typing_presences"("expires_at");
