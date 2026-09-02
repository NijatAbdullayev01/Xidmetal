import { Module } from '@nestjs/common';
import { NotificationChannelsModule } from '../../common/notifications/notification-channels.module';
import { CommissionModule } from '../commission/commission.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [NotificationChannelsModule, CommissionModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
