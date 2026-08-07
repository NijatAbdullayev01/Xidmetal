import {
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PAYMENTS } from '@xidmetal/shared';

export class CreatePaymentIntentDto {
  @ApiProperty({ description: 'Əlaqəli sifariş ID (məcburi)' })
  @IsUUID()
  bookingId!: string;

  /**
   * Opsional — server həmişə booking.totalPrice istifadə edir.
   * Göndərilərsə, sifariş məbləği ilə uyğun olmalıdır (tolerance 0.01).
   */
  @ApiPropertyOptional({
    example: 50,
    description: 'Məbləğ (opsional; server booking.totalPrice götürür)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  @Max(1_000_000)
  amount?: number;

  @ApiPropertyOptional({ example: 'AZN', default: PAYMENTS.DEFAULT_CURRENCY })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(3)
  currency?: string;

  @ApiPropertyOptional({ description: 'İdempotency açarı (body və ya header)' })
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(PAYMENTS.IDEMPOTENCY_KEY_MAX_LEN)
  idempotencyKey?: string;
}

export class PaymentActionDto {
  @ApiPropertyOptional({ description: 'İdempotency açarı' })
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(PAYMENTS.IDEMPOTENCY_KEY_MAX_LEN)
  idempotencyKey?: string;
}
