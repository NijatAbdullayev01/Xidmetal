import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { AvailabilityOverrideType } from '@xidmetal/shared';

const TIME_HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_YMD = /^\d{4}-\d{2}-\d{2}$/;

export class WorkingHoursEntryDto {
  @ApiProperty({ description: '0=Bazar ... 6=Şənbə', minimum: 0, maximum: 6 })
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;

  @ApiProperty({ example: '09:00' })
  @IsString()
  @Matches(TIME_HH_MM, { message: 'Saat HH:mm formatında olmalıdır' })
  startTime!: string;

  @ApiProperty({ example: '18:00' })
  @IsString()
  @Matches(TIME_HH_MM, { message: 'Saat HH:mm formatında olmalıdır' })
  endTime!: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpsertWorkingHoursDto {
  @ApiProperty({ type: [WorkingHoursEntryDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkingHoursEntryDto)
  hours!: WorkingHoursEntryDto[];
}

export class CreateAvailabilityOverrideDto {
  @ApiProperty({ example: '2026-07-30' })
  @IsString()
  @Matches(DATE_YMD, { message: 'Tarix YYYY-MM-DD formatında olmalıdır' })
  date!: string;

  @ApiPropertyOptional({ example: '10:00', nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined && v !== '')
  @IsString()
  @Matches(TIME_HH_MM, { message: 'Saat HH:mm formatında olmalıdır' })
  startTime?: string | null;

  @ApiPropertyOptional({ example: '12:00', nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined && v !== '')
  @IsString()
  @Matches(TIME_HH_MM, { message: 'Saat HH:mm formatında olmalıdır' })
  endTime?: string | null;

  @ApiProperty({ enum: AvailabilityOverrideType })
  @IsEnum(AvailabilityOverrideType)
  type!: AvailabilityOverrideType;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string | null;
}

export class AvailabilityQueryDto {
  @ApiProperty({ example: '2026-07-28' })
  @IsString()
  @Matches(DATE_YMD, { message: 'Tarix YYYY-MM-DD formatında olmalıdır' })
  from!: string;

  @ApiProperty({ example: '2026-08-28' })
  @IsString()
  @Matches(DATE_YMD, { message: 'Tarix YYYY-MM-DD formatında olmalıdır' })
  to!: string;
}
