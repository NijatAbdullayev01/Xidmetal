import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators';
import { UsersService } from './users.service';

@ApiTags('Providers')
@Controller('providers')
export class ProvidersController {
  constructor(private usersService: UsersService) {}

  @Public()
  @Get(':id')
  @ApiOperation({
    summary: 'Xidmət verənin ictimai profili',
    description:
      'Yalnız təsdiqlənmiş, aktiv xidmət verənlər. E-poçt və telefon qaytarılmır.',
  })
  findPublic(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findPublicProvider(id);
  }
}
