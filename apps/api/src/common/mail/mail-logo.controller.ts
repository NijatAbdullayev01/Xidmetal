import {
  Controller,
  Get,
  Header,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { createReadStream } from 'node:fs';
import { Public } from '../decorators';
import { findMailLogoFile } from './mail-layout';

@ApiTags('Mail')
@Controller('mail')
export class MailLogoController {
  @Public()
  @Get('logo.png')
  @Header('Cache-Control', 'public, max-age=86400')
  @ApiOperation({ summary: 'E-poçt loqosu (PNG)' })
  logo(): StreamableFile {
    const file = findMailLogoFile();
    if (!file) {
      throw new NotFoundException('Loqo tapılmadı');
    }
    return new StreamableFile(createReadStream(file), {
      type: 'image/png',
      disposition: 'inline; filename="logo.png"',
    });
  }
}
