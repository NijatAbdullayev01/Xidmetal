import {
  IsOptional,
  IsUUID,
  MaxLength,
  MinLength,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RejectDispatchOfferDto {
  @ApiPropertyOptional({ description: 'Rədd səbəbi (opsional)' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason?: string;
}

export class AdminDispatchOffersQueryDto {
  @ApiProperty({ description: 'Sifariş ID' })
  @IsUUID()
  bookingId!: string;
}
