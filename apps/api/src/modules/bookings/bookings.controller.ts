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
import { JwtAuthGuard, EmailVerifiedGuard, RolesGuard } from '../../common/guards';
import { CurrentUser, RequireEmailVerified, Roles } from '../../common/decorators';
import { UserRole } from '@xidmetal/shared';

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
    return this.bookingsService.findAll(
      userId,
      role,
      query.page,
      query.limit,
      query.status,
      query.statuses,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Sifariş detalları' })
  findOne(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.bookingsService.findById(id, userId, role);
  }

  @Post()
  @UseGuards(RolesGuard, EmailVerifiedGuard)
  @Roles(UserRole.CUSTOMER)
  @RequireEmailVerified()
  @ApiOperation({ summary: 'Yeni sifariş yarat' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateBookingDto) {
    return this.bookingsService.create(userId, dto);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard, EmailVerifiedGuard)
  @Roles(UserRole.CUSTOMER, UserRole.PROVIDER, UserRole.ADMIN)
  @RequireEmailVerified()
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
  @UseGuards(RolesGuard, EmailVerifiedGuard)
  @Roles(UserRole.PROVIDER)
  @RequireEmailVerified()
  @ApiOperation({ summary: 'Sifarişə yeni tarix təklif et (xidmət verən)' })
  reschedule(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: RescheduleBookingDto,
  ) {
    return this.bookingsService.reschedule(id, userId, dto);
  }

  @Patch(':id/reschedule/confirm')
  @UseGuards(RolesGuard, EmailVerifiedGuard)
  @Roles(UserRole.CUSTOMER)
  @RequireEmailVerified()
  @ApiOperation({ summary: 'Yeni tarix təklifini təsdiqlə (müştəri)' })
  confirmReschedule(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.bookingsService.confirmReschedule(id, userId);
  }

  @Patch(':id/reschedule/reject')
  @UseGuards(RolesGuard, EmailVerifiedGuard)
  @Roles(UserRole.CUSTOMER)
  @RequireEmailVerified()
  @ApiOperation({ summary: 'Yeni tarix təklifini rədd et (müştəri)' })
  rejectReschedule(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.bookingsService.rejectReschedule(id, userId);
  }
}
