import { Injectable, Logger } from '@nestjs/common';
import type { Server } from 'socket.io';
import {
  REALTIME_EVENTS,
  bookingRoom,
  userRoom,
  type BookingStatusPayload,
  type LocationUpdatePayload,
  type NotificationNewPayload,
} from '@xidmetal/shared';

/**
 * Socket.IO yayım helper — gateway afterInit ilə server bağlanır.
 * Redis adapter varsa multi-instance; yoxdursa in-memory.
 */
@Injectable()
export class RealtimeService {
  private readonly logger = new Logger(RealtimeService.name);
  private server: Server | null = null;

  setServer(server: Server): void {
    this.server = server;
  }

  isReady(): boolean {
    return this.server != null;
  }

  emitLocationUpdate(bookingId: string, payload: LocationUpdatePayload): void {
    this.emitToRoom(bookingRoom(bookingId), REALTIME_EVENTS.LOCATION_UPDATE, payload);
  }

  emitBookingStatus(payload: BookingStatusPayload): void {
    this.emitToRoom(bookingRoom(payload.bookingId), REALTIME_EVENTS.BOOKING_STATUS, payload);
  }

  emitNotificationNew(userId: string, payload: NotificationNewPayload): void {
    this.emitToRoom(userRoom(userId), REALTIME_EVENTS.NOTIFICATION_NEW, payload);
  }

  emitToRoom(room: string, event: string, payload: unknown): void {
    if (!this.server) {
      this.logger.debug(`WS hazır deyil, skip: ${event} → ${room}`);
      return;
    }
    this.server.to(room).emit(event, payload);
  }
}
