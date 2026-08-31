import { Module } from '@nestjs/common';
import { ProvidersController } from './providers.controller';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [UsersController, ProvidersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
