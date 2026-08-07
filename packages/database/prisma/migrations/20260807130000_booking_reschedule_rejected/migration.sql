-- Tarix təklifi rədd bildirişi (sifariş PENDING qalır — CANCELLED tipindən fərqli)
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'BOOKING_RESCHEDULE_REJECTED';
