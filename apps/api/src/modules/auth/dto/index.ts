import { IsEmail, IsEnum, IsOptional, IsString, MinLength, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@xidmetal/shared';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: 'Düzgün e-mail daxil edin' })
  email!: string;

  @ApiProperty({ example: 'SecurePass1' })
  @IsString()
  @MinLength(8, { message: 'Şifrə minimum 8 simvol olmalıdır' })
  @Matches(/[A-Z]/, { message: 'Şifrədə ən azı bir böyük hərf olmalıdır' })
  @Matches(/[0-9]/, { message: 'Şifrədə ən azı bir rəqəm olmalıdır' })
  password!: string;

  @ApiProperty({ example: 'Əli' })
  @IsString()
  @MinLength(2)
  firstName!: string;

  @ApiProperty({ example: 'Məmmədov' })
  @IsString()
  @MinLength(2)
  lastName!: string;

  @ApiPropertyOptional({ example: '+994501234567' })
  @IsOptional()
  @IsString()
  @Matches(/^(\+994|0)[0-9]{9}$/, {
    message: 'Düzgün telefon nömrəsi daxil edin (+994XXXXXXXXX)',
  })
  phone?: string;

  @ApiPropertyOptional({ enum: UserRole, default: UserRole.CUSTOMER })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  password!: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  refreshToken!: string;
}
