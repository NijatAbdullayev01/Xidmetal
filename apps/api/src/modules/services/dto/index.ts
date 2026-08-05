import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsUUID,
  IsEnum,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  Min,
  Max,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ServiceStatus, PriceUnit, ServiceVenue, CargoRouteScope, MAX_SERVICE_IMAGES } from '@xidmetal/shared';

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

  @ApiProperty({ description: 'Xidmət göstərilən şəhər/rayon' })
  @IsString()
  @MinLength(1, { message: 'Ünvan seçin' })
  location!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isRemote?: boolean;

  @ApiPropertyOptional({ enum: ServiceVenue })
  @IsOptional()
  @IsEnum(ServiceVenue)
  serviceVenue?: ServiceVenue;

  @ApiPropertyOptional({ description: 'Yük yeri uzunluğu (metr)' })
  @IsOptional()
  @IsNumber()
  @Min(0.1, { message: 'Maşın uzunluğu 0-dan böyük olmalıdır' })
  @Max(30, { message: 'Maşın uzunluğu maksimum 30 m ola bilər' })
  vehicleLength?: number;

  @ApiPropertyOptional({ description: 'Yük yeri eni (metr)' })
  @IsOptional()
  @IsNumber()
  @Min(0.1, { message: 'Maşın eni 0-dan böyük olmalıdır' })
  @Max(30, { message: 'Maşın eni maksimum 30 m ola bilər' })
  vehicleWidth?: number;

  @ApiPropertyOptional({ description: 'Yük yeri hündürlüyü (metr)' })
  @IsOptional()
  @IsNumber()
  @Min(0.1, { message: 'Maşın hündürlüyü 0-dan böyük olmalıdır' })
  @Max(30, { message: 'Maşın hündürlüyü maksimum 30 m ola bilər' })
  vehicleHeight?: number;

  @ApiPropertyOptional({ enum: CargoRouteScope, description: 'Şəhərdaxili / şəhərlərarası' })
  @IsOptional()
  @IsEnum(CargoRouteScope)
  cargoRouteScope?: CargoRouteScope;

  @ApiProperty({
    description: 'Xidmət şəkilləri (data URL və ya http URL)',
    type: [String],
    minItems: 1,
    maxItems: MAX_SERVICE_IMAGES,
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Ən azı 1 şəkil əlavə edin' })
  @ArrayMaxSize(MAX_SERVICE_IMAGES, {
    message: `Maksimum ${MAX_SERVICE_IMAGES} şəkil əlavə etmək olar`,
  })
  @IsString({ each: true })
  @MaxLength(2_000_000, { each: true })
  images!: string[];
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
  @MinLength(1, { message: 'Ünvan seçin' })
  location?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isRemote?: boolean;

  @ApiPropertyOptional({ enum: ServiceVenue })
  @IsOptional()
  @IsEnum(ServiceVenue)
  serviceVenue?: ServiceVenue;

  @ApiPropertyOptional({ description: 'Yük yeri uzunluğu (metr)' })
  @IsOptional()
  @IsNumber()
  @Min(0.1, { message: 'Maşın uzunluğu 0-dan böyük olmalıdır' })
  @Max(30, { message: 'Maşın uzunluğu maksimum 30 m ola bilər' })
  vehicleLength?: number;

  @ApiPropertyOptional({ description: 'Yük yeri eni (metr)' })
  @IsOptional()
  @IsNumber()
  @Min(0.1, { message: 'Maşın eni 0-dan böyük olmalıdır' })
  @Max(30, { message: 'Maşın eni maksimum 30 m ola bilər' })
  vehicleWidth?: number;

  @ApiPropertyOptional({ description: 'Yük yeri hündürlüyü (metr)' })
  @IsOptional()
  @IsNumber()
  @Min(0.1, { message: 'Maşın hündürlüyü 0-dan böyük olmalıdır' })
  @Max(30, { message: 'Maşın hündürlüyü maksimum 30 m ola bilər' })
  vehicleHeight?: number;

  @ApiPropertyOptional({ enum: CargoRouteScope, description: 'Şəhərdaxili / şəhərlərarası' })
  @IsOptional()
  @IsEnum(CargoRouteScope)
  cargoRouteScope?: CargoRouteScope;

  @ApiPropertyOptional({ enum: ServiceStatus })
  @IsOptional()
  @IsEnum(ServiceStatus)
  status?: ServiceStatus;

  @ApiPropertyOptional({
    description: 'Xidmət şəkilləri — göndərildikdə mövcudları tam əvəz edir',
    type: [String],
    minItems: 1,
    maxItems: MAX_SERVICE_IMAGES,
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, { message: 'Ən azı 1 şəkil əlavə edin' })
  @ArrayMaxSize(MAX_SERVICE_IMAGES, {
    message: `Maksimum ${MAX_SERVICE_IMAGES} şəkil əlavə etmək olar`,
  })
  @IsString({ each: true })
  @MaxLength(2_000_000, { each: true })
  images?: string[];
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
