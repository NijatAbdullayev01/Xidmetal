import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto, ReviewQueryDto } from './dto';
import { JwtAuthGuard, RolesGuard, EmailVerifiedGuard } from '../../common/guards';
import { Public, Roles, RequireEmailVerified } from '../../common/decorators';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@xidmetal/shared';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private reviewsService: ReviewsService) {}

  @Public()
  @Get('provider/:providerId')
  @ApiOperation({
    summary: 'Xidmət verənin ictimai rəyləri',
    description:
      'Təsdiqlənmiş müştəri rəyləri — qonaqlar və digər müştərilər baxa bilər. Adlar qismən anonimdir.',
  })
  findByProvider(@Param('providerId') providerId: string, @Query() query: ReviewQueryDto) {
    return this.reviewsService.findPublicByProvider(providerId, query);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard, EmailVerifiedGuard)
  @Roles(UserRole.CUSTOMER, UserRole.PROVIDER)
  @RequireEmailVerified()
  @Post()
  @ApiOperation({ summary: 'Tamamlanmış sifarişə rəy və reytinq yaz' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateReviewDto) {
    return this.reviewsService.create(userId, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER)
  @Get('received')
  @ApiOperation({ summary: 'Provider-ə gələn rəylər (PENDING daxil)' })
  findReceived(
    @CurrentUser('id') userId: string,
    @Query() query: ReviewQueryDto,
  ) {
    return this.reviewsService.findReceivedByProvider(userId, query);
  }
}
