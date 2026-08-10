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

  @ApiPropertyOptional({ description: 'Profil şəkli URL (storage allowlist)' })
  @IsOptional()
  @IsString()
  @MaxLength(2_000, { message: 'Şəkil URL çox uzundur' })
  avatarUrl?: string | null;

  @ApiPropertyOptional({ example: 5, description: 'İş təcrübəsi (il ilə)' })
  @IsOptional()
  @IsInt({ message: 'Təcrübə tam rəqəm olmalıdır' })
  @Min(0, { message: 'Təcrübə mənfi ola bilməz' })
  @Max(50, { message: 'Təcrübə maksimum 50 il ola bilər' })
  experience?: number;

  @ApiPropertyOptional({ example: '10 ildir təmir işləri ilə məşğulam', description: 'Qısa bio' })
  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Bio maksimum 1000 simvol ola bilər' })
  bio?: string;

  @ApiPropertyOptional({ example: 'Bakı', description: 'Əsas fəaliyyət ünvanı' })
  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'Ünvan çox uzundur' })
  location?: string;
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
  @IsEmail({}, { message: 'Düzgün e-poçt daxil edin' })
  newEmail!: string;
}

export class ConfirmEmailChangeDto {
  @ApiProperty({ example: 'yeni@example.com' })
  @IsEmail({}, { message: 'Düzgün e-poçt daxil edin' })
  newEmail!: string;

  @ApiProperty({ example: '12345678' })
  @IsString()
  @Length(8, 8, { message: 'Təsdiq kodu 8 rəqəm olmalıdır' })
  @Matches(/^\d{8}$/, { message: 'Təsdiq kodu yalnız rəqəmlərdən ibarət olmalıdır' })
  code!: string;
}

export class DeleteAccountDto {
  @ApiProperty({ description: 'Cari şifrə' })
  @IsString()
  @MinLength(1, { message: 'Şifrə tələb olunur' })
  password!: string;

  @ApiProperty({ example: 'Sil', description: 'Təsdiq üçün Sil yazın' })
  @IsString()
  @Matches(/^SIL$/i, { message: 'Təsdiq üçün Sil yazın' })
  confirmText!: string;
}
