import { Module, forwardRef } from '@nestjs/common';
import { GeoModule } from '../geo/geo.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { TrackingService } from './tracking.service';
import { TrackingController } from './tracking.controller';
import { EtaService } from './eta.service';

@Module({
  imports: [GeoModule, forwardRef(() => RealtimeModule)],
  controllers: [TrackingController],
  providers: [TrackingService, EtaService],
  exports: [TrackingService],
})
export class TrackingModule {}
