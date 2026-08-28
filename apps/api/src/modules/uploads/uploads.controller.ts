import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { IsIn, IsString } from 'class-validator';
import { memoryStorage } from 'multer';
import type { Express } from 'express';
import { StorageService } from '../../common/storage/storage.service';
import {
  MAX_UPLOAD_BYTES,
  UPLOAD_FOLDERS,
  type UploadFolder,
} from '../../common/storage/storage.types';
import { CurrentUser, RequireEmailVerified } from '../../common/decorators';
import { EmailVerifiedGuard, JwtAuthGuard } from '../../common/guards';
import { assertUploadFolderAccess } from '../../common/storage/upload-folder-access';

class UploadImageDto {
  @IsString()
  @IsIn(Object.values(UPLOAD_FOLDERS), {
    message: 'Qovluq services, avatars, bookings, kyc və ya messages olmalıdır',
  })
  folder!: UploadFolder;
}

@ApiTags('Uploads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, EmailVerifiedGuard)
@RequireEmailVerified()
@Controller('uploads')
export class UploadsController {
  constructor(private storageService: StorageService) {}

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({
    summary: 'Şəkil yüklə (URL qaytarır; DB-yə base64 yazılmır)',
    description:
      'Limit: 10 req/dəq, istifadəçi başına 30/saat. Orphan fayllar 24 saat sonra silinir.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'folder'],
      properties: {
        file: { type: 'string', format: 'binary' },
        folder: {
          type: 'string',
          enum: Object.values(UPLOAD_FOLDERS),
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_UPLOAD_BYTES },
    }),
  )
  async upload(
    @CurrentUser() user: { id: string; role: string },
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: UploadImageDto,
  ) {
    if (!file) {
      throw new BadRequestException('Şəkil faylı tələb olunur');
    }

    assertUploadFolderAccess(dto.folder, user.role);
    const stored = await this.storageService.uploadImage(file, dto.folder, user.id);
    return { url: stored.url };
  }
}
