import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
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
import { RequireEmailVerified, Roles } from '../../common/decorators';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  EmailVerifiedGuard,
  JwtAuthGuard,
  RolesGuard,
} from '../../common/guards';
import { CreatePaymentIntentDto, PaymentActionDto } from './dto';
import { PaymentsService } from './payments.service';

@ApiTags('Payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Post('intents')
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.CUSTOMER)
  @UseGuards(EmailVerifiedGuard)
  @RequireEmailVerified()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Payment intent yarat (yalnız PAYMENTS_ENABLED=true; xidmət alan)',
  })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: false,
    description: 'Təkrar sorğuları təhlükəsiz etmək üçün',
  })
  createIntent(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Body() dto: CreatePaymentIntentDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.paymentsService.createIntent(
      userId,
      role,
      dto,
      idempotencyKey,
    );
  }

  @Get(':id')
  @Roles(UserRole.CUSTOMER, UserRole.PROVIDER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Ödəniş detalları' })
  findOne(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.paymentsService.findOne(userId, role, id);
  }

  @Post(':id/authorize')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.CUSTOMER)
  @UseGuards(EmailVerifiedGuard)
  @RequireEmailVerified()
  @ApiOperation({ summary: 'Hold / authorize (xidmət alan)' })
  @ApiHeader({ name: 'Idempotency-Key', required: false })
  authorize(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PaymentActionDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.paymentsService.authorizeHold(
      userId,
      role,
      id,
      dto,
      idempotencyKey,
    );
  }

  @Post(':id/capture')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.CUSTOMER)
  @UseGuards(EmailVerifiedGuard)
  @RequireEmailVerified()
  @ApiOperation({ summary: 'Capture (xidmət alan)' })
  @ApiHeader({ name: 'Idempotency-Key', required: false })
  capture(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PaymentActionDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.paymentsService.capture(
      userId,
      role,
      id,
      dto,
      idempotencyKey,
    );
  }

  @Post(':id/refund')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN)
  @UseGuards(EmailVerifiedGuard)
  @RequireEmailVerified()
  @ApiOperation({ summary: 'Refund (yalnız admin)' })
  @ApiHeader({ name: 'Idempotency-Key', required: false })
  refund(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PaymentActionDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.paymentsService.refund(
      userId,
      role,
      id,
      dto,
      idempotencyKey,
    );
  }
}
