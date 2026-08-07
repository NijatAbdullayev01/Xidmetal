import { IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { contactSubjectValues } from '@xidmetal/shared';

const CONTACT_SUBJECTS = [...contactSubjectValues];

export class ContactMessageDto {
  @ApiProperty({ example: 'Əli Məmmədov' })
  @IsString()
  @MinLength(2, { message: 'Ad minimum 2 simvol olmalıdır' })
  @MaxLength(100)
  name!: string;

  @ApiProperty({ example: 'ali@example.com' })
  @IsEmail({}, { message: 'Düzgün e-poçt daxil edin' })
  email!: string;

  @ApiPropertyOptional({ example: '+994501234567' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiProperty({ enum: CONTACT_SUBJECTS, example: 'general' })
  @IsIn(CONTACT_SUBJECTS, { message: 'Mövzu seçin' })
  subject!: (typeof contactSubjectValues)[number];

  @ApiProperty({ example: 'Platforma haqqında sualım var...' })
  @IsString()
  @MinLength(10, { message: 'Mesaj minimum 10 simvol olmalıdır' })
  @MaxLength(2000, { message: 'Mesaj maksimum 2000 simvol ola bilər' })
  message!: string;

  /** Honeypot — botlar doldurur; UI-də gizlidir */
  @ApiPropertyOptional({ description: 'Spam əleyhinə (boş saxlanılmalıdır)' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;

  /** Cloudflare Turnstile — secret setdirsə məcburidir */
  @ApiPropertyOptional({ description: 'Turnstile captcha token' })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  captchaToken?: string;
}
