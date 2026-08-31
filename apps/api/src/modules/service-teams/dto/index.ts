import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SERVICE_TEAMS } from '@xidmetal/shared';

export class CreateServiceTeamDto {
  @ApiProperty({ example: 'Xalça yuma — komanda 2' })
  @IsString()
  @MinLength(SERVICE_TEAMS.NAME_MIN_LENGTH, {
    message: `Komanda adı minimum ${SERVICE_TEAMS.NAME_MIN_LENGTH} simvol olmalıdır`,
  })
  @MaxLength(SERVICE_TEAMS.NAME_MAX_LENGTH, {
    message: `Komanda adı maksimum ${SERVICE_TEAMS.NAME_MAX_LENGTH} simvol ola bilər`,
  })
  name!: string;
}

export class UpdateServiceTeamDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(SERVICE_TEAMS.NAME_MIN_LENGTH, {
    message: `Komanda adı minimum ${SERVICE_TEAMS.NAME_MIN_LENGTH} simvol olmalıdır`,
  })
  @MaxLength(SERVICE_TEAMS.NAME_MAX_LENGTH, {
    message: `Komanda adı maksimum ${SERVICE_TEAMS.NAME_MAX_LENGTH} simvol ola bilər`,
  })
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
