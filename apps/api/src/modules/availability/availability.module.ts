import { Module } from '@nestjs/common';
import { BookingCapacityModule } from '../../common/booking/booking-capacity.module';
import { AvailabilityController } from './availability.controller';
import { AvailabilityService } from './availability.service';

@Module({
  imports: [BookingCapacityModule],
  controllers: [AvailabilityController],
  providers: [AvailabilityService],
  exports: [AvailabilityService],
})
export class AvailabilityModule {}

