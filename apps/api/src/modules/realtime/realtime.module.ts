import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TrackingModule } from '../tracking/tracking.module';
import { RealtimeGateway } from './realtime.gateway';
import { RealtimeService } from './realtime.service';
import { WsAuthService } from './ws-auth.service';
import { RealtimeController } from './realtime.controller';
import { ProviderPresenceService } from './provider-presence.service';

@Module({
  imports: [AuthModule, forwardRef(() => TrackingModule)],
  controllers: [RealtimeController],
  providers: [
    RealtimeGateway,
    RealtimeService,
    WsAuthService,
    ProviderPresenceService,
  ],
  exports: [RealtimeService, ProviderPresenceService],
})
export class RealtimeModule {}
