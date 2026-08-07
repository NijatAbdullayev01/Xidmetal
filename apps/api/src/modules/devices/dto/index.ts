import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DevicePlatform } from '@xidmetal/shared';

export class RegisterDeviceTokenDto {
  @ApiProperty({ description: 'FCM / Web Push token' })
  @IsString()
  @MinLength(32)
  @MaxLength(4096)
  token!: string;

  @ApiProperty({ enum: DevicePlatform })
  @IsEnum(DevicePlatform)
  platform!: DevicePlatform;
}

export class UnregisterDeviceTokenDto {
  @ApiProperty({ description: 'Silinəcək token' })
  @IsString()
  @MinLength(32)
  @MaxLength(4096)
  token!: string;
}
