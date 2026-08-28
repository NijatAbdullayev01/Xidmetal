import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AnalyticsEventType } from '@xidmetal/shared';

export class AnalyticsBeaconEventDto {
  @ApiProperty({ enum: AnalyticsEventType })
  @IsEnum(AnalyticsEventType)
  type!: AnalyticsEventType;

  @ApiPropertyOptional({ example: '/services' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Matches(/^\//, { message: 'Path / ilə başlamalıdır' })
  path?: string;

  @ApiPropertyOptional({ example: 'cta_book_service' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ description: 'Client timestamp (ms)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  ts?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  meta?: Record<string, string>;
}

export class AnalyticsBeaconDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  anonymousId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  sessionId!: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'İgnor edilir — yalnız JWT sub' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ example: '/' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Matches(/^\//, { message: 'Path / ilə başlamalıdır' })
  landingPath?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  referrer?: string;

  @ApiPropertyOptional({ example: 'az-AZ' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  language?: string;

  @ApiPropertyOptional({ example: 1280 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10000)
  screenWidth?: number;

  @ApiPropertyOptional({ description: 'Sessiya müddəti (ms)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(86_400_000)
  durationMs?: number;

  @ApiProperty({ type: [AnalyticsBeaconEventDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => AnalyticsBeaconEventDto)
  events!: AnalyticsBeaconEventDto[];
}

export class AdminAnalyticsQueryDto {
  @ApiPropertyOptional({ example: '2026-08-01', description: 'YYYY-MM-DD' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'from YYYY-MM-DD formatında olmalıdır' })
  from?: string;

  @ApiPropertyOptional({ example: '2026-08-11', description: 'YYYY-MM-DD' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'to YYYY-MM-DD formatında olmalıdır' })
  to?: string;
}
