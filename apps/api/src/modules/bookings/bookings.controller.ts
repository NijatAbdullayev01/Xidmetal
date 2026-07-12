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
import {
  CreateBookingDto,
  RescheduleBookingDto,
  UpdateBookingStatusDto,
  BookingQueryDto,
} from './dto';
import { JwtAuthGuard } from '../../common/guards';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

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
    @Query() query: BookingQueryDto,
  ) {
    return this.bookingsService.findAll(userId, role, query.page, query.limit, query.status);
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

  @Patch(':id/reschedule')
  @ApiOperation({ summary: 'Sifarişə yeni tarix təklif et (xidmət verən)' })
  reschedule(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: RescheduleBookingDto,
  ) {
    return this.bookingsService.reschedule(id, userId, dto);
  }

  @Patch(':id/reschedule/confirm')
  @ApiOperation({ summary: 'Yeni tarix təklifini təsdiqlə (müştəri)' })
  confirmReschedule(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.bookingsService.confirmReschedule(id, userId);
  }

  @Patch(':id/reschedule/reject')
  @ApiOperation({ summary: 'Yeni tarix təklifini rədd et (müştəri)' })
  rejectReschedule(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.bookingsService.rejectReschedule(id, userId);
  }
}
