import { Global, Module } from '@nestjs/common';
import { MailLogoController } from './mail-logo.controller';
import { MailService } from './mail.service';

@Global()
@Module({
  controllers: [MailLogoController],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
