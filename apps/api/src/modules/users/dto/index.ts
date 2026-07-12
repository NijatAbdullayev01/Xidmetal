import {
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Əli' })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Ad minimum 2 simvol olmalıdır' })
  firstName?: string;

  @ApiPropertyOptional({ example: 'Məmmədov' })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Soyad minimum 2 simvol olmalıdır' })
  lastName?: string;

  @ApiPropertyOptional({ example: '+994501234567' })
  @IsOptional()
  @IsString()
  @Matches(/^(\+994|0)[0-9]{9}$|^$/, {
    message: 'Düzgün telefon nömrəsi daxil edin (+994XXXXXXXXX)',
  })
  phone?: string;

  @ApiPropertyOptional({ description: 'Profil şəkli URL və ya data URL' })
  @IsOptional()
  @IsString()
  @MaxLength(2_000_000, { message: 'Şəkil çox böyükdür' })
  avatarUrl?: string | null;

  @ApiPropertyOptional({ example: 5, description: 'İş təcrübəsi (il ilə)' })
  @IsOptional()
  @IsInt({ message: 'Təcrübə tam rəqəm olmalıdır' })
  @Min(0, { message: 'Təcrübə mənfi ola bilməz' })
  @Max(50, { message: 'Təcrübə maksimum 50 il ola bilər' })
  experience?: number;
}

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  currentPassword!: string;

  @ApiProperty({ example: 'SecurePass1' })
  @IsString()
  @MinLength(8, { message: 'Şifrə minimum 8 simvol olmalıdır' })
  @Matches(/[A-Z]/, { message: 'Şifrədə ən azı bir böyük hərf olmalıdır' })
  @Matches(/[0-9]/, { message: 'Şifrədə ən azı bir rəqəm olmalıdır' })
  newPassword!: string;
}

export class RequestEmailChangeDto {
  @ApiProperty({ example: 'yeni@example.com' })
  @IsEmail({}, { message: 'Düzgün e-mail daxil edin' })
  newEmail!: string;
}

export class ConfirmEmailChangeDto {
  @ApiProperty({ example: 'yeni@example.com' })
  @IsEmail({}, { message: 'Düzgün e-mail daxil edin' })
  newEmail!: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(6, 6, { message: 'Təsdiq kodu 6 rəqəm olmalıdır' })
  @Matches(/^\d{6}$/, { message: 'Təsdiq kodu yalnız rəqəmlərdən ibarət olmalıdır' })
  code!: string;
}
