import { Module, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DispatchModule } from '../dispatch/dispatch.module';
import { GeoController } from './geo.controller';
import { GeoService } from './geo.service';
import { EtaService } from './eta.service';
import { createGeocoderAdapter, GEOCODER_ADAPTER } from './geocoder';

@Module({
  imports: [forwardRef(() => DispatchModule)],
  controllers: [GeoController],
  providers: [
    GeoService,
    EtaService,
    {
      provide: GEOCODER_ADAPTER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => createGeocoderAdapter(config),
    },
  ],
  exports: [GeoService, EtaService],
})
export class GeoModule {}
