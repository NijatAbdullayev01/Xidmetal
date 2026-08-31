import { Module } from '@nestjs/common';
import { ServiceCapacityService } from './service-capacity.service';

@Module({
  providers: [ServiceCapacityService],
  exports: [ServiceCapacityService],
})
export class BookingCapacityModule {}
