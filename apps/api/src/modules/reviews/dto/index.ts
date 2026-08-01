import {
  IsOptional,
  IsUUID,
  IsInt,
  IsString,
  Min,
  Max,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateReviewDto {
  @ApiProperty()
  @IsUUID()
  bookingId!: string;

  @ApiProperty({ minimum: 1, maximum: 5, description: '1–5 ulduz reytinq' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @ApiPropertyOptional({ minLength: 10, maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  comment?: string;
}

export class ReviewQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number;

  /** Yalnız bu xidmətə aid rəylər */
  @ApiPropertyOptional({ description: 'Xidmət ID ilə filtr' })
  @IsOptional()
  @IsUUID()
  serviceId?: string;
}
