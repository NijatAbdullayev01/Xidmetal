import {
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { COMMISSION } from '@xidmetal/shared';

export class InitiateDepositDto {
  @ApiProperty({ description: 'Saxlanmış kart ID' })
  @IsUUID()
  cardId!: string;

  @ApiProperty({ example: 50, description: 'Top-up məbləği (AZN)' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(COMMISSION.MIN_DEPOSIT_AZN)
  @Max(COMMISSION.MAX_DEPOSIT_AZN)
  amount!: number;
}

export class AdminAdjustWalletDto {
  @ApiProperty({
    example: 15,
    description: 'Kreditləşdiriləcək məbləğ (AZN, müsbət) — borcu azaldır',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(COMMISSION.MAX_DEPOSIT_AZN)
  amount!: number;

  @ApiPropertyOptional({
    description: 'Qeyd — köçürmə tarixi / nömrəsi və s.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class CommissionTransactionQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}
