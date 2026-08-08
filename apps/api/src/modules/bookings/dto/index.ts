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

  @ApiPropertyOptional({ description: 'Xidmətin göstəriləcəyi ünvan (yerində xidmət üçün məcburi)' })
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
    description: 'Təyinat enliyi (INSTANT üçün məcburi)',
  })
  @ValidateIf((o: CreateBookingDto) => o.type === BookingType.INSTANT)
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  destLat?: number;

  @ApiPropertyOptional({
    description: 'Təyinat uzunluğu (INSTANT üçün məcburi)',
  })
  @ValidateIf((o: CreateBookingDto) => o.type === BookingType.INSTANT)
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
}

export class UpdateBookingStatusDto {
  @ApiProperty({ enum: BookingStatus })
  @IsEnum(BookingStatus)
  status!: BookingStatus;

  @ApiPropertyOptional({ description: 'Ləğv səbəbi (CANCELLED olduqda tövsiyə olunur)' })
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
