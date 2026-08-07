import { Module } from '@nestjs/common';
import { SmsModule } from '../../common/sms/sms.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [SmsModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
