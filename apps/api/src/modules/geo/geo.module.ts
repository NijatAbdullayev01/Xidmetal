import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GeoController } from './geo.controller';
import { GeoService } from './geo.service';
import { createGeocoderAdapter, GEOCODER_ADAPTER } from './geocoder';

@Module({
  controllers: [GeoController],
  providers: [
    GeoService,
    {
      provide: GEOCODER_ADAPTER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => createGeocoderAdapter(config),
    },
  ],
  exports: [GeoService],
})
export class GeoModule {}
