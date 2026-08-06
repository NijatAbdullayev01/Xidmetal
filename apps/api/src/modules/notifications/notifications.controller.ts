import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UserRole } from '@xidmetal/shared';
import { NotificationsService } from './notifications.service';
import { NotificationQueryDto } from './dto';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { Roles } from '../../common/decorators';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.CUSTOMER, UserRole.PROVIDER)
@Controller('notifications')
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Bildirişlər siyahısı' })
  findAll(
    @CurrentUser('id') userId: string,
    @Query() query: NotificationQueryDto,
  ) {
    return this.notificationsService.findAll(userId, query.page, query.limit);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Oxunmamış admin/platforma bildirişləri sayı' })
  getUnreadCount(@CurrentUser('id') userId: string) {
    return this.notificationsService.getUnreadCount(userId);
  }

  @Get('booking-unread-count')
  @ApiOperation({ summary: 'Sifariş bildirişləri sayı (nav badge)' })
  getBookingUnreadCount(@CurrentUser('id') userId: string) {
    return this.notificationsService.getBookingAttentionCount(userId);
  }

  @Post('booking-read-all')
  @ApiOperation({ summary: 'Sifariş bildirişlərini oxundu et' })
  markBookingReadAll(@CurrentUser('id') userId: string) {
    return this.notificationsService.markBookingNotificationsRead(userId);
  }

  @Get('review-unread-count')
  @ApiOperation({ summary: 'Rəy bildirişləri sayı (provider reytinq badge)' })
  @Roles(UserRole.PROVIDER)
  getReviewUnreadCount(@CurrentUser('id') userId: string) {
    return this.notificationsService.getReviewAttentionCount(userId);
  }

  @Post('review-read-all')
  @ApiOperation({ summary: 'Rəy bildirişlərini oxundu et' })
  @Roles(UserRole.PROVIDER)
  markReviewReadAll(@CurrentUser('id') userId: string) {
    return this.notificationsService.markReviewNotificationsRead(userId);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Admin bildirişini oxundu et' })
  markRead(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.notificationsService.markRead(id, userId);
  }

  @Post('read-all')
  @ApiOperation({ summary: 'Bütün admin bildirişlərini oxundu et' })
  markAllRead(@CurrentUser('id') userId: string) {
    return this.notificationsService.markAllRead(userId);
  }
}
