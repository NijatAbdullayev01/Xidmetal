import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReportReason, ReportTargetType } from '@xidmetal/shared';

export class CreateReportDto {
  @ApiProperty({ enum: ReportTargetType })
  @IsEnum(ReportTargetType, { message: 'Hədəf növü seçin' })
  targetType!: ReportTargetType;

  @ApiPropertyOptional({ description: 'Şikayət olunan obyektin ID-si' })
  @IsOptional()
  @ValidateIf((_, v) => v !== '' && v !== undefined && v !== null)
  @IsUUID('4', { message: 'Düzgün ID daxil edin' })
  targetId?: string;

  @ApiProperty({ enum: ReportReason })
  @IsEnum(ReportReason, { message: 'Səbəb seçin' })
  reason!: ReportReason;

  @ApiProperty({ example: 'Xidmət verən razılaşdırılmış vaxtda gəlmədi...' })
  @IsString()
  @MinLength(10, { message: 'Təsvir minimum 10 simvol olmalıdır' })
  @MaxLength(2000, { message: 'Təsvir maksimum 2000 simvol ola bilər' })
  description!: string;
}
