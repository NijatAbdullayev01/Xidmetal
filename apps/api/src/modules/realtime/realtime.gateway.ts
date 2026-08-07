import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Inject, Logger, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Server, Socket } from 'socket.io';
import {
  REALTIME_EVENTS,
  UserRole,
  bookingRoom,
  providerRoom,
  userRoom,
  type BookingSubscribePayload,
  type LocationPushPayload,
} from '@xidmetal/shared';
import { WsAuthService } from './ws-auth.service';
import { RealtimeService } from './realtime.service';
import { TrackingService } from '../tracking/tracking.service';
import { ProviderPresenceService } from './provider-presence.service';
import type { WsAuthenticatedUser } from './realtime-auth';
import { MetricsService } from '../../common/metrics/metrics.service';

function resolveCorsOrigins(config: ConfigService): string | string[] {
  const socketCors = config.get<string>('SOCKET_CORS_ORIGIN')?.trim();
  const corsOriginRaw =
    socketCors ||
    config.get<string>(
      'CORS_ORIGIN',
      'http://localhost:3020,http://localhost:3021',
    );
  const origins = [
    ...corsOriginRaw.split(','),
    config.get<string>('NEXT_PUBLIC_APP_URL'),
    config.get<string>('NEXT_PUBLIC_ADMIN_URL'),
  ]
    .map((origin) => origin?.trim())
    .filter((origin): origin is string => Boolean(origin))
    .filter((origin, index, all) => all.indexOf(origin) === index);

  if (origins.length === 0) return '*';
  return origins.length === 1 ? origins[0]! : origins;
}

@WebSocketGateway({
  cors: { origin: true, credentials: true },
  transports: ['websocket', 'polling'],
})
export class RealtimeGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private wsAuth: WsAuthService,
    private realtime: RealtimeService,
    @Inject(forwardRef(() => TrackingService))
    private tracking: TrackingService,
    private config: ConfigService,
    private presence: ProviderPresenceService,
    private metrics: MetricsService,
  ) {}

  afterInit(server: Server): void {
    const origins = resolveCorsOrigins(this.config);
    server.engine.on(
      'headers',
      (
        headers: Record<string, string>,
        req: { headers?: { origin?: string } },
      ) => {
        const origin = req.headers?.origin;
        if (!origin) return;
        const allowed =
          origins === '*' ||
          (typeof origins === 'string'
            ? origins === origin
            : origins.includes(origin));
        if (allowed) {
          headers['Access-Control-Allow-Origin'] = origin;
          headers['Access-Control-Allow-Credentials'] = 'true';
        }
      },
    );

    this.realtime.setServer(server);
    this.logger.log('Socket.IO gateway hazır');
  }

  async handleConnection(client: Socket): Promise<void> {
    try {
      const user = await this.wsAuth.authenticateSocket(client);
      client.data.user = user;
      await client.join(userRoom(user.id));
      if (user.role === UserRole.PROVIDER) {
        await client.join(providerRoom(user.id));
        void this.presence.onProviderConnect(user.id).catch((err) => {
          this.logger.debug(
            `Presence connect: ${err instanceof Error ? err.message : String(err)}`,
          );
        });
      }
      this.metrics.incWsConnection();
      this.logger.debug(`WS qoşuldu: ${user.id}`);
    } catch (error) {
      const message =
        error instanceof WsException
          ? String(error.getError())
          : error instanceof Error
            ? error.message
            : 'Autentifikasiya uğursuz';
      this.logger.debug(`WS rədd: ${message}`);
      client.emit('exception', { message });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket): void {
    const user = client.data?.user as WsAuthenticatedUser | undefined;
    if (user) {
      this.metrics.decWsConnection();
      this.logger.debug(`WS ayrıldı: ${user.id}`);
      if (user.role === UserRole.PROVIDER) {
        void this.presence.onProviderDisconnect(user.id).catch((err) => {
          this.logger.debug(
            `Presence disconnect: ${err instanceof Error ? err.message : String(err)}`,
          );
        });
      }
    }
  }

  @SubscribeMessage(REALTIME_EVENTS.BOOKING_SUBSCRIBE)
  async onBookingSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: BookingSubscribePayload,
  ) {
    const user = this.requireUser(client);
    const bookingId = body?.bookingId?.trim();
    if (!bookingId) {
      throw new WsException('bookingId tələb olunur');
    }
    try {
      await this.tracking.assertCanSubscribe(user, bookingId);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'İcazə yoxdur';
      throw new WsException(msg);
    }
    await client.join(bookingRoom(bookingId));
    return { ok: true, room: bookingRoom(bookingId) };
  }

  @SubscribeMessage(REALTIME_EVENTS.BOOKING_UNSUBSCRIBE)
  async onBookingUnsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: BookingSubscribePayload,
  ) {
    this.requireUser(client);
    const bookingId = body?.bookingId?.trim();
    if (!bookingId) {
      throw new WsException('bookingId tələb olunur');
    }
    await client.leave(bookingRoom(bookingId));
    return { ok: true };
  }

  @SubscribeMessage(REALTIME_EVENTS.LOCATION_PUSH)
  async onLocationPush(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: LocationPushPayload,
  ) {
    const user = this.requireUser(client);
    const result = await this.tracking.handleLocationPush(user, body);
    if (!result.ok) {
      return { ok: false, reason: result.reason };
    }
    return { ok: true, sampled: result.sampled };
  }

  private requireUser(client: Socket): WsAuthenticatedUser {
    const user = client.data?.user as WsAuthenticatedUser | undefined;
    if (!user) {
      throw new WsException('Autentifikasiya tələb olunur');
    }
    return user;
  }
}
