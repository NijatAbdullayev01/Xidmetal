import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { ReviewQueryDto } from './dto';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { Roles } from '../../common/decorators';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@xidmetal/shared';

@ApiTags('Reviews')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reviews')
export class ReviewsController {
  constructor(private reviewsService: ReviewsService) {}

  @Roles(UserRole.PROVIDER)
  @Get('received')
  @ApiOperation({ summary: 'Provider-ə gələn rəylər' })
  findReceived(
    @CurrentUser('id') userId: string,
    @Query() query: ReviewQueryDto,
  ) {
    return this.reviewsService.findReceivedByProvider(userId, query);
  }
}
