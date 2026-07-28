import { IsUUID, IsString, IsOptional, IsEnum, IsDateString, MaxLength, MinLength, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { BookingStatus } from '@xidmetal/shared';

export class CreateBookingDto {
  @ApiProperty()
  @IsUUID()
  serviceId!: string;

  @ApiProperty({ example: '2026-07-15T10:00:00.000Z' })
  @IsDateString()
  scheduledAt!: string;

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

  @ApiPropertyOptional({ description: 'Görüləcək işin şəkli (data URL və ya http URL)' })
  @IsOptional()
  @IsString()
  @MaxLength(2_000_000)
  imageUrl?: string;
}

export class UpdateBookingStatusDto {
  @ApiProperty({ enum: BookingStatus })
  @IsEnum(BookingStatus)
  status!: BookingStatus;
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
}
