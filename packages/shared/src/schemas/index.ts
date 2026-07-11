import { z } from 'zod';
import { UserRole } from '../enums';

export const emailSchema = z.string().email('Düzgün e-mail daxil edin');
export const passwordSchema = z
  .string()
  .min(8, 'Şifrə minimum 8 simvol olmalıdır')
  .regex(/[A-Z]/, 'Şifrədə ən azı bir böyük hərf olmalıdır')
  .regex(/[0-9]/, 'Şifrədə ən azı bir rəqəm olmalıdır');

export const phoneSchema = z
  .string()
  .regex(/^(\+994|0)[0-9]{9}$/, 'Düzgün telefon nömrəsi daxil edin (+994XXXXXXXXX)');

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: z.string().min(2, 'Ad minimum 2 simvol olmalıdır'),
  lastName: z.string().min(2, 'Soyad minimum 2 simvol olmalıdır'),
  phone: phoneSchema.optional(),
  role: z.nativeEnum(UserRole).default(UserRole.CUSTOMER),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Şifrə tələb olunur'),
});

export const createServiceSchema = z.object({
  title: z.string().min(3, 'Başlıq minimum 3 simvol olmalıdır').max(200),
  description: z.string().min(10, 'Təsvir minimum 10 simvol olmalıdır').max(5000),
  categoryId: z.string().uuid('Kateqoriya seçin'),
  price: z.number().positive('Qiymət müsbət olmalıdır'),
  priceUnit: z.enum(['FIXED', 'HOURLY', 'DAILY']).default('FIXED'),
  duration: z.number().int().positive().optional(),
  location: z.string().optional(),
  isRemote: z.boolean().default(false),
});

export const createBookingSchema = z.object({
  serviceId: z.string().uuid(),
  scheduledAt: z.string().datetime(),
  notes: z.string().max(1000).optional(),
  address: z.string().max(500).optional(),
});

export const createReviewSchema = z.object({
  bookingId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(10).max(2000).optional(),
});

export const updateServiceSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().min(10).max(5000).optional(),
  categoryId: z.string().uuid().optional(),
  price: z.number().positive().optional(),
  priceUnit: z.enum(['FIXED', 'HOURLY', 'DAILY']).optional(),
  location: z.string().optional(),
  isRemote: z.boolean().optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED']).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
