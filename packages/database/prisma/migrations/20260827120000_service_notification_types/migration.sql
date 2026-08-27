-- Xidmət təsdiqi / düzəlişi — Bildirişlər inbox-undan ayrı kanal
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SERVICE_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SERVICE_NEEDS_REVISION';
