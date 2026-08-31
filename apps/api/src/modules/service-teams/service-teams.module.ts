import { Module } from '@nestjs/common';
import { BookingCapacityModule } from '../../common/booking/booking-capacity.module';
import { ServiceTeamsController } from './service-teams.controller';
import { ServiceTeamsService } from './service-teams.service';

@Module({
  imports: [BookingCapacityModule],
  controllers: [ServiceTeamsController],
  providers: [ServiceTeamsService],
  exports: [ServiceTeamsService],
})
export class ServiceTeamsModule {}
