import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsUUID,
  IsEnum,
  Min,
  Max,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ServiceStatus, PriceUnit, ServiceVenue } from '@xidmetal/shared';

export class CreateServiceDto {
  @ApiProperty()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title!: string;

  @ApiProperty()
  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  description!: string;

  @ApiProperty()
  @IsUUID()
  categoryId!: string;

  @ApiProperty({ description: '0 = razılaşma ilə' })
  @IsNumber()
  @Min(0, { message: 'Qiymət mənfi ola bilməz' })
  price!: number;

  @ApiPropertyOptional({ enum: PriceUnit })
  @IsOptional()
  @IsEnum(PriceUnit)
  priceUnit?: PriceUnit;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  duration?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isRemote?: boolean;

  @ApiPropertyOptional({ enum: ServiceVenue })
  @IsOptional()
  @IsEnum(ServiceVenue)
  serviceVenue?: ServiceVenue;
}

export class UpdateServiceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ description: '0 = razılaşma ilə' })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Qiymət mənfi ola bilməz' })
  price?: number;

  @ApiPropertyOptional({ enum: PriceUnit })
  @IsOptional()
  @IsEnum(PriceUnit)
  priceUnit?: PriceUnit;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isRemote?: boolean;

  @ApiPropertyOptional({ enum: ServiceVenue })
  @IsOptional()
  @IsEnum(ServiceVenue)
  serviceVenue?: ServiceVenue;

  @ApiPropertyOptional({ enum: ServiceStatus })
  @IsOptional()
  @IsEnum(ServiceStatus)
  status?: ServiceStatus;
}

export class ServiceQueryDto {
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  providerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}
