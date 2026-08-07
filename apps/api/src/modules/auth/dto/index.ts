import {
  IsEmail,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
  Matches,
  Length,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@xidmetal/shared';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: 'Düzgün e-poçt daxil edin' })
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

  @ApiPropertyOptional({ description: 'Cloudflare Turnstile token' })
  @IsOptional()
  @IsString()
  captchaToken?: string;
}

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  password!: string;

  @ApiProperty({
    enum: ['marketplace', 'admin'],
    description: 'Klient audinesi — məcburi; yanlış app-də session cookie qoyulmur',
  })
  @IsIn(['marketplace', 'admin'])
  clientApp!: 'marketplace' | 'admin';

  @ApiPropertyOptional({ description: 'Cloudflare Turnstile token' })
  @IsOptional()
  @IsString()
  captchaToken?: string;
}

export class RefreshTokenDto {
  @ApiPropertyOptional({
    description: 'Opsional — httpOnly cookie varsa lazım deyil',
  })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}

export class LogoutDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  refreshToken?: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: 'Düzgün e-poçt daxil edin' })
  email!: string;

  @ApiPropertyOptional({ description: 'Cloudflare Turnstile token' })
  @IsOptional()
  @IsString()
  captchaToken?: string;
}

export class ResetPasswordDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: 'Düzgün e-poçt daxil edin' })
  email!: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(6, 6, { message: 'Təsdiq kodu 6 rəqəm olmalıdır' })
  @Matches(/^\d{6}$/, { message: 'Təsdiq kodu yalnız rəqəmlərdən ibarət olmalıdır' })
  code!: string;

  @ApiProperty({ example: 'SecurePass1' })
  @IsString()
  @MinLength(8, { message: 'Şifrə minimum 8 simvol olmalıdır' })
  @Matches(/[A-Z]/, { message: 'Şifrədə ən azı bir böyük hərf olmalıdır' })
  @Matches(/[0-9]/, { message: 'Şifrədə ən azı bir rəqəm olmalıdır' })
  newPassword!: string;
}

export class RequestEmailVerificationDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: 'Düzgün e-poçt daxil edin' })
  email!: string;
}

export class ConfirmEmailVerificationDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: 'Düzgün e-poçt daxil edin' })
  email!: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(6, 6, { message: 'Təsdiq kodu 6 rəqəm olmalıdır' })
  @Matches(/^\d{6}$/, { message: 'Təsdiq kodu yalnız rəqəmlərdən ibarət olmalıdır' })
  code!: string;
}
