import {
  IsEmail,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
  Matches,
  Length,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  COMPANY_NAME_MAX_LENGTH,
  ProviderAccountType,
  UserRole,
} from '@xidmetal/shared';

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

  @ApiPropertyOptional({ example: 'Əli' })
  @ValidateIf(
    (dto: RegisterDto) =>
      !(dto.role === UserRole.PROVIDER && dto.providerAccountType === ProviderAccountType.COMPANY),
  )
  @IsString()
  @MinLength(2, { message: 'Ad minimum 2 simvol olmalıdır' })
  firstName?: string;

  @ApiPropertyOptional({ example: 'Məmmədov' })
  @ValidateIf(
    (dto: RegisterDto) =>
      !(dto.role === UserRole.PROVIDER && dto.providerAccountType === ProviderAccountType.COMPANY),
  )
  @IsString()
  @MinLength(2, { message: 'Soyad minimum 2 simvol olmalıdır' })
  lastName?: string;

  @ApiProperty({ example: '+994501234567' })
  @IsString()
  @Matches(/^(\+994|0)[0-9]{9}$/, {
    message: 'Düzgün telefon nömrəsi daxil edin (+994XXXXXXXXX)',
  })
  phone!: string;

  @ApiPropertyOptional({ enum: UserRole, default: UserRole.CUSTOMER })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({
    enum: ProviderAccountType,
    description: 'Yalnız xidmət verən — fərdi və ya şirkət',
  })
  @IsOptional()
  @IsEnum(ProviderAccountType)
  providerAccountType?: ProviderAccountType;

  @ApiPropertyOptional({ example: 'Xidmətal MMC' })
  @ValidateIf((dto: RegisterDto) => dto.providerAccountType === ProviderAccountType.COMPANY)
  @IsString({ message: 'Şirkət adı tələb olunur' })
  @MinLength(2, { message: 'Şirkət adı minimum 2 simvol olmalıdır' })
  @MaxLength(COMPANY_NAME_MAX_LENGTH, {
    message: `Şirkət adı maksimum ${COMPANY_NAME_MAX_LENGTH} simvol ola bilər`,
  })
  companyName?: string;

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

  @ApiProperty({ example: '12345678' })
  @IsString()
  @Length(8, 8, { message: 'Təsdiq kodu 8 rəqəm olmalıdır' })
  @Matches(/^\d{8}$/, { message: 'Təsdiq kodu yalnız rəqəmlərdən ibarət olmalıdır' })
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

  @ApiPropertyOptional({ description: 'Cloudflare Turnstile token' })
  @IsOptional()
  @IsString()
  captchaToken?: string;
}

export class ConfirmEmailVerificationDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: 'Düzgün e-poçt daxil edin' })
  email!: string;

  @ApiProperty({ example: '12345678' })
  @IsString()
  @Length(8, 8, { message: 'Təsdiq kodu 8 rəqəm olmalıdır' })
  @Matches(/^\d{8}$/, { message: 'Təsdiq kodu yalnız rəqəmlərdən ibarət olmalıdır' })
  code!: string;
}
