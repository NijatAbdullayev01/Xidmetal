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
import { UserRole } from '@xidmetal/shared';
import { AdminService } from './admin.service';
import {
  AdminBookingsQueryDto,
  AdminReportsQueryDto,
  AdminReviewsQueryDto,
  AdminServicesQueryDto,
  AdminUsersQueryDto,
  CreateAnnouncementDto,
  CreateCategoryDto,
  SetProviderVerifiedDto,
  SetReportStatusDto,
  SetReviewStatusDto,
  SetServiceStatusDto,
  RequestServiceRevisionDto,
  SetUserActiveDto,
  UpdateCategoryDto,
  SetKycStatusDto,
  AdminContactQueryDto,
  AdminPaginationQueryDto,
} from './dto';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { Roles } from '../../common/decorators';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Platforma statistikası' })
  getStats() {
    return this.adminService.getStats();
  }

  @Get('users')
  @ApiOperation({ summary: 'İstifadəçilər siyahısı' })
  listUsers(@Query() query: AdminUsersQueryDto) {
    return this.adminService.listUsers(query);
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'İstifadəçi detalları' })
  getUser(@Param('id') id: string) {
    return this.adminService.getUser(id);
  }

  @Patch('users/:id/active')
  @ApiOperation({ summary: 'İstifadəçini aktiv/deaktiv et' })
  setUserActive(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: SetUserActiveDto,
  ) {
    return this.adminService.setUserActive(id, adminId, dto);
  }

  @Patch('providers/:userId/verify')
  @ApiOperation({ summary: 'Xidmət verəni təsdiqlə / təsdiqi ləğv et' })
  setProviderVerified(
    @Param('userId') userId: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: SetProviderVerifiedDto,
  ) {
    return this.adminService.setProviderVerified(userId, dto, adminId);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Bütün kateqoriyalar (aktiv + deaktiv)' })
  listCategories() {
    return this.adminService.listCategories();
  }

  @Post('categories')
  @ApiOperation({ summary: 'Yeni kateqoriya yarat' })
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.adminService.createCategory(dto);
  }

  @Patch('categories/:id')
  @ApiOperation({ summary: 'Kateqoriyanı yenilə' })
  updateCategory(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.adminService.updateCategory(id, dto);
  }

  @Get('services')
  @ApiOperation({ summary: 'Bütün xidmətlər' })
  listServices(@Query() query: AdminServicesQueryDto) {
    return this.adminService.listServices(query);
  }

  @Patch('services/:id/status')
  @ApiOperation({ summary: 'Xidmət statusunu dəyiş' })
  setServiceStatus(@Param('id') id: string, @Body() dto: SetServiceStatusDto) {
    return this.adminService.setServiceStatus(id, dto);
  }

  @Patch('services/:id/approve')
  @ApiOperation({ summary: 'Xidməti təsdiqlə (PENDING_REVIEW → ACTIVE)' })
  approveService(@Param('id') id: string) {
    return this.adminService.approveService(id);
  }

  @Patch('services/:id/request-revision')
  @ApiOperation({ summary: 'Xidməti düzəlişə göndər' })
  requestServiceRevision(@Param('id') id: string, @Body() dto: RequestServiceRevisionDto) {
    return this.adminService.requestServiceRevision(id, dto);
  }

  @Get('bookings')
  @ApiOperation({ summary: 'Bütün sifarişlər' })
  listBookings(@Query() query: AdminBookingsQueryDto) {
    return this.adminService.listBookings(query);
  }

  @Get('reviews')
  @ApiOperation({ summary: 'Rəylər (moderation)' })
  listReviews(@Query() query: AdminReviewsQueryDto) {
    return this.adminService.listReviews(query);
  }

  @Patch('reviews/:id/status')
  @ApiOperation({ summary: 'Rəyi təsdiqlə / rədd et' })
  setReviewStatus(@Param('id') id: string, @Body() dto: SetReviewStatusDto) {
    return this.adminService.setReviewStatus(id, dto);
  }

  @Get('reports')
  @ApiOperation({ summary: 'Şikayətlər siyahısı' })
  listReports(@Query() query: AdminReportsQueryDto) {
    return this.adminService.listReports(query);
  }

  @Patch('reports/:id/status')
  @ApiOperation({ summary: 'Şikayəti həll et / rədd et' })
  setReportStatus(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: SetReportStatusDto,
  ) {
    return this.adminService.setReportStatus(id, adminId, dto);
  }

  @Post('announcements')
  @ApiOperation({ summary: 'Platforma bildirişi göndər' })
  createAnnouncement(@Body() dto: CreateAnnouncementDto) {
    return this.adminService.createAnnouncement(dto);
  }

  @Get('providers/:userId/kyc')
  @ApiOperation({ summary: 'Xidmət verənin KYC sənədləri' })
  listProviderKyc(@Param('userId') userId: string) {
    return this.adminService.listProviderKyc(userId);
  }

  @Patch('kyc/:id/status')
  @ApiOperation({ summary: 'KYC sənədini təsdiqlə / rədd et' })
  setKycStatus(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: SetKycStatusDto,
  ) {
    return this.adminService.setKycStatus(id, adminId, dto);
  }

  @Get('contact')
  @ApiOperation({ summary: 'Əlaqə formu mesajları' })
  listContact(@Query() query: AdminContactQueryDto) {
    return this.adminService.listContactMessages(query);
  }

  @Patch('contact/:id/read')
  @ApiOperation({ summary: 'Əlaqə mesajını oxundu işarələ' })
  markContactRead(@Param('id') id: string, @CurrentUser('id') adminId: string) {
    return this.adminService.markContactRead(id, adminId);
  }

  @Get('audit')
  @ApiOperation({ summary: 'Admin audit jurnalı' })
  listAudit(@Query() query: AdminPaginationQueryDto) {
    return this.adminService.listAuditLogs(query);
  }
}
