-- Köhnə admin inbox sətirlərini xidmət kanalına köçür
UPDATE "notifications"
SET "type" = 'SERVICE_NEEDS_REVISION'
WHERE "type" = 'ADMIN_ANNOUNCEMENT'
  AND (data->>'serviceNeedsRevision') = 'true';

UPDATE "notifications"
SET "type" = 'SERVICE_APPROVED'
WHERE "type" = 'ADMIN_ANNOUNCEMENT'
  AND (data->>'serviceApproved') = 'true';
