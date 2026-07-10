import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { CreateBookingDto, UpdateBookingStatusDto } from './dto';
import { JwtAuthGuard } from '../../common/guards';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { BookingStatus } from '@xidmetal/shared';

@ApiTags('Bookings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bookings')
export class BookingsController {
  constructor(private bookingsService: BookingsService) {}

  @Get()
  @ApiOperation({ summary: 'Sifarişlər siyahısı' })
  findAll(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: BookingStatus,
  ) {
    return this.bookingsService.findAll(userId, role, page, limit, status);
  }

  @Post()
  @ApiOperation({ summary: 'Yeni sifariş yarat' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateBookingDto) {
    return this.bookingsService.create(userId, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Sifariş statusunu yenilə' })
  updateStatus(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Body() dto: UpdateBookingStatusDto,
  ) {
    return this.bookingsService.updateStatus(id, userId, role, dto);
  }
}
