import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@xidmetal/shared';
import { CurrentUser, Roles } from '../../common/decorators';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { DispatchService } from './dispatch.service';
import {
  AdminDispatchOffersQueryDto,
  RejectDispatchOfferDto,
} from './dto';

@ApiTags('Dispatch')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dispatch')
export class DispatchController {
  constructor(private dispatch: DispatchService) {}

  @Get('offers/pending')
  @Roles(UserRole.PROVIDER)
  @ApiOperation({
    summary: 'Aktiv on-demand təkliflərim (PENDING, vaxtı bitməmiş)',
  })
  listPending(@CurrentUser('id') providerId: string) {
    return this.dispatch.listPendingForProvider(providerId);
  }

  @Get('offers')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Admin: sifariş üzrə bütün dispatch təklifləri' })
  listForBooking(
    @Query() query: AdminDispatchOffersQueryDto,
    @CurrentUser('role') role: string,
  ) {
    return this.dispatch.listForBooking(query.bookingId, role);
  }

  @Post('offers/:id/accept')
  @Roles(UserRole.PROVIDER)
  @ApiOperation({ summary: 'On-demand təklifi qəbul et' })
  accept(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') providerId: string,
  ) {
    return this.dispatch.acceptOffer(id, providerId);
  }

  @Post('offers/:id/reject')
  @Roles(UserRole.PROVIDER)
  @ApiOperation({ summary: 'On-demand təklifi rədd et' })
  reject(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') providerId: string,
    @Body() dto: RejectDispatchOfferDto,
  ) {
    return this.dispatch.rejectOffer(id, providerId, dto.reason);
  }
}
