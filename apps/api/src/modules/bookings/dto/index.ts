import {
  IsUUID,
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  MaxLength,
  MinLength,
  Min,
  Max,
  IsArray,
  IsNumber,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { BookingStatus, BookingType } from '@xidmetal/shared';

export class CreateBookingDto {
  @ApiProperty()
  @IsUUID()
  serviceId!: string;

  @ApiPropertyOptional({
    example: '2026-07-15T10:00:00.000Z',
    description:
      'SCHEDULED üçün məcburi. INSTANT-da opsional — server yaxın gələcək window təyin edir.',
  })
  @ValidateIf(
    (o: CreateBookingDto) =>
      o.type === undefined || o.type === BookingType.SCHEDULED,
  )
  @IsDateString()
  scheduledAt?: string;

  @ApiProperty({ description: 'Müştəri qeydi' })
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  notes!: string;

  @ApiPropertyOptional({
    description: 'Xidmətin göstəriləcəyi yazılı ünvan (yerində xidmət üçün məcburi)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @ApiPropertyOptional({ description: 'Görüləcək işin şəkli (http/https URL)' })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  imageUrl?: string;

  @ApiPropertyOptional({
    enum: BookingType,
    default: BookingType.SCHEDULED,
    description:
      'SCHEDULED (default) — slot + əl ilə təsdiq. INSTANT — yaxın xidmət verənlərə avto-dispatch.',
  })
  @IsOptional()
  @IsEnum(BookingType)
  type?: BookingType;

  @ApiPropertyOptional({
    description: 'Təyinat enliyi (xəritə mövqeyi; ani sifarişdə məcburi)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  destLat?: number;

  @ApiPropertyOptional({
    description: 'Təyinat uzunluğu (xəritə mövqeyi; ani sifarişdə məcburi)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  destLng?: number;

  @ApiPropertyOptional({ description: 'Mənşə enliyi (opsional)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  originLat?: number;

  @ApiPropertyOptional({ description: 'Mənşə uzunluğu (opsional)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  originLng?: number;

  @ApiPropertyOptional({
    description: 'INSTANT dispatch — minimum xidmət verən reytinqi (0–5)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(5)
  minRating?: number;

  @ApiPropertyOptional({
    description: 'INSTANT dispatch — minimum xidmət qiyməti',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({
    description: 'INSTANT dispatch — maksimum xidmət qiyməti',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({
    example: 'Bakı, Nəsimi rayonu',
    description:
      'INSTANT — xidmət ərazisi (şəhər/rayon kataloqu). Bakı daxili rayon seçimi bütün Bakı üzrə xidmət verənlərə ötürülür.',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  serviceLocation?: string;
}

export class UpdateBookingStatusDto {
  @ApiProperty({ enum: BookingStatus })
  @IsEnum(BookingStatus)
  status!: BookingStatus;

  @ApiPropertyOptional({
    description: 'Ləğv/imtina səbəbi (CANCELLED və REJECTED üçün tələb olunur)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  cancelReason?: string;
}

export class RescheduleBookingDto {
  @ApiProperty({ example: '2026-07-16T14:00:00.000Z' })
  @IsDateString()
  scheduledAt!: string;

  @ApiProperty({ description: 'Müştəriyə göndəriləcək mesaj' })
  @IsString()
  @MaxLength(1000)
  message!: string;
}

export class BookingQueryDto {
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

  @ApiPropertyOptional({ enum: BookingStatus })
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;

  @ApiPropertyOptional({
    description:
      'Vergüllə ayrılmış statuslar (məs. CONFIRMED,EN_ROUTE,ARRIVED,IN_PROGRESS). `status`-dan üstündür.',
    example: 'CONFIRMED,EN_ROUTE,ARRIVED,IN_PROGRESS',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (Array.isArray(value)) {
      return value.map(String);
    }
    if (typeof value === 'string') {
      return value
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean);
    }
    return undefined;
  })
  @IsArray()
  @IsEnum(BookingStatus, { each: true })
  statuses?: BookingStatus[];
}
