import { z } from 'zod';
import { UserRole, PriceUnit } from '../enums';
import { PRICE_UNIT_VALUES } from '../price-units';
import { SERVICE_VENUE_VALUES } from '../service-venues';

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
  title: z.string().min(3, 'Xidmət növü minimum 3 simvol olmalıdır').max(200),
  description: z.string().min(10, 'Təsvir minimum 10 simvol olmalıdır').max(5000),
  categoryId: z.string().uuid('Kateqoriya seçin'),
  price: z.number().positive('Qiymət müsbət olmalıdır'),
  priceUnit: z.enum(PRICE_UNIT_VALUES).default(PriceUnit.FIXED),
  duration: z.number().int().positive().optional(),
  location: z.string().optional(),
  isRemote: z.boolean().default(false),
  serviceVenue: z.enum(SERVICE_VENUE_VALUES).optional(),
});

export const createBookingSchema = z.object({
  serviceId: z.string().uuid(),
  scheduledAt: z.string().datetime(),
  notes: z.string().max(1000).optional(),
  address: z.string().max(500).optional(),
});

export const rescheduleBookingSchema = z.object({
  scheduledAt: z.string().datetime(),
  message: z.string().min(1, 'Müştəriyə mesaj yazmaq mütləqdir').max(1000),
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
  priceUnit: z.enum(PRICE_UNIT_VALUES).optional(),
  location: z.string().optional(),
  isRemote: z.boolean().optional(),
  serviceVenue: z.enum(SERVICE_VENUE_VALUES).optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED']).optional(),
});

const avatarUrlSchema = z
  .string()
  .max(2_000_000, 'Şəkil çox böyükdür')
  .refine(
    (val) =>
      val.startsWith('data:image/') ||
      val.startsWith('http://') ||
      val.startsWith('https://'),
    'Düzgün şəkil formatı daxil edin',
  );

export const updateProfileSchema = z.object({
  firstName: z.string().min(2, 'Ad minimum 2 simvol olmalıdır').optional(),
  lastName: z.string().min(2, 'Soyad minimum 2 simvol olmalıdır').optional(),
  phone: z.union([phoneSchema, z.literal('')]).optional(),
  avatarUrl: z.union([avatarUrlSchema, z.literal(''), z.null()]).optional(),
  experience: z
    .number()
    .int('Təcrübə tam rəqəm olmalıdır')
    .min(0, 'Təcrübə mənfi ola bilməz')
    .max(50, 'Təcrübə maksimum 50 il ola bilər')
    .optional(),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Cari şifrə tələb olunur'),
    newPassword: passwordSchema,
    confirmNewPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: 'Şifrələr uyğun gəlmir',
    path: ['confirmNewPassword'],
  });

export const requestEmailChangeSchema = z.object({
  newEmail: emailSchema,
});

export const confirmEmailChangeSchema = z.object({
  newEmail: emailSchema,
  code: z
    .string()
    .length(6, 'Təsdiq kodu 6 rəqəm olmalıdır')
    .regex(/^\d{6}$/, 'Təsdiq kodu yalnız rəqəmlərdən ibarət olmalıdır'),
});

export const createConversationSchema = z.object({
  providerId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  bookingId: z.string().uuid().optional(),
  initialMessage: z.string().min(1, 'Mesaj boş ola bilməz').max(2000).optional(),
});

export const sendMessageSchema = z.object({
  content: z.string().min(1, 'Mesaj boş ola bilməz').max(2000),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type RescheduleBookingInput = z.infer<typeof rescheduleBookingSchema>;
export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type RequestEmailChangeInput = z.infer<typeof requestEmailChangeSchema>;
export type ConfirmEmailChangeInput = z.infer<typeof confirmEmailChangeSchema>;
export type CreateConversationInput = z.infer<typeof createConversationSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
