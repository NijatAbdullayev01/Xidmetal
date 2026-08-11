import { Module, forwardRef } from '@nestjs/common';
import { GeoModule } from '../geo/geo.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { TrackingService } from './tracking.service';
import { TrackingController } from './tracking.controller';

@Module({
  imports: [GeoModule, forwardRef(() => RealtimeModule)],
  controllers: [TrackingController],
  providers: [TrackingService],
  exports: [TrackingService],
})
export class TrackingModule {}
