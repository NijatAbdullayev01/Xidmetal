import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { UserRole } from '@xidmetal/shared';
import { Public, Roles } from '../../common/decorators';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { CommissionService } from './commission.service';
import { CommissionTransactionQueryDto, InitiateDepositDto } from './dto';

@ApiTags('Commission')
@Controller('commission')
export class CommissionController {
  constructor(private commissionService: CommissionService) {}

  @Get('account')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER)
  @ApiOperation({ summary: 'Xidmət verənin hesab (borc/balans) xülasəsi' })
  getAccount(@CurrentUser('id') userId: string) {
    return this.commissionService.getAccount(userId);
  }

  @Get('transactions')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER)
  @ApiOperation({ summary: 'Hesab əməliyyatları (ledger)' })
  listTransactions(
    @CurrentUser('id') userId: string,
    @Query() query: CommissionTransactionQueryDto,
  ) {
    return this.commissionService.listTransactions(userId, query.page, query.limit);
  }

  @Get('cards')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER)
  @ApiOperation({ summary: 'Saxlanmış kartlar (maskalı)' })
  listCards(@CurrentUser('id') userId: string) {
    return this.commissionService.listCards(userId);
  }

  @Post('cards')
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Kart əlavə et (Epoint tokenizasiya başlat)' })
  startCardRegistration(@CurrentUser('id') userId: string) {
    return this.commissionService.startCardRegistration(userId);
  }

  @Delete('cards/:id')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER)
  @ApiOperation({ summary: 'Kartı sil' })
  deleteCard(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.commissionService.deleteCard(userId, id);
  }

  @Post('deposits')
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Saxlanmış kart ilə balans top-up' })
  @ApiHeader({ name: 'Idempotency-Key', required: false })
  initiateDeposit(
    @CurrentUser('id') userId: string,
    @Body() dto: InitiateDepositDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.commissionService.initiateDeposit(userId, dto, idempotencyKey);
  }

  /** Epoint webhook — public, imza ilə yoxlanılır (JWT yox). */
  @Post('epoint/callback')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Epoint ödəniş callback (imza ilə)' })
  epointCallback(
    @Body() body: { data?: string; signature?: string },
  ): Promise<void> {
    const data = body?.data ?? '';
    const signature = body?.signature ?? '';
    return this.commissionService.handleCallback(data, signature);
  }
}
