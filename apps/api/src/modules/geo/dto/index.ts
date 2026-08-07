import {
  IsEnum,
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
import { Type } from 'class-transformer';
import { ProviderAvailability } from '@xidmetal/shared';

export class UpdateProviderLocationDto {
  @ApiProperty({ example: 40.4093, description: 'Enlik (-90…90)' })
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number;

  @ApiProperty({ example: 49.8671, description: 'Uzunluq (-180…180)' })
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng!: number;

  @ApiPropertyOptional({ example: 90, description: 'İstiqamət 0…360°' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(360)
  heading?: number;

  @ApiPropertyOptional({
    enum: ProviderAvailability,
    description: 'Eyni vaxtda əlçatanlıq (opsional)',
  })
  @IsOptional()
  @IsEnum(ProviderAvailability)
  availability?: ProviderAvailability;
}

export class UpdateProviderAvailabilityDto {
  @ApiProperty({ enum: ProviderAvailability, description: 'OFFLINE | ONLINE | BUSY' })
  @IsEnum(ProviderAvailability)
  availability!: ProviderAvailability;
}

export class NearbyProvidersQueryDto {
  @ApiProperty({ example: 40.4093 })
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number;

  @ApiProperty({ example: 49.8671 })
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng!: number;

  @ApiPropertyOptional({ default: 10, description: 'Radius (km), max 100' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.1)
  @Max(100)
  radiusKm?: number;

  @ApiPropertyOptional({ description: 'Kateqoriya UUID (aktiv xidməti olan)' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number;
}

export class GeocodeQueryDto {
  @ApiProperty({ example: 'Bakı, Nəsimi', description: 'Ünvan / axtarış mətni' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  q!: string;
}

export class ReverseGeocodeQueryDto {
  @ApiProperty({ example: 40.4093 })
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number;

  @ApiProperty({ example: 49.8671 })
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng!: number;
}
