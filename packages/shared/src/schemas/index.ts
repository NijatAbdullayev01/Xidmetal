import { z } from 'zod';
import {
  UserRole,
  PriceUnit,
  AvailabilityOverrideType,
  ReviewStatus,
  ServiceStatus,
  BookingStatus,
  BookingType,
  ProviderAvailability,
  ReportReason,
  ReportTargetType,
  ReportStatus,
  DevicePlatform,
} from '../enums';
import { PRICE_UNIT_VALUES } from '../price-units';
import { SERVICE_VENUE_VALUES } from '../service-venues';
import { CARGO_ROUTE_SCOPE_VALUES } from '../vehicle-cargo';
import { isValidCoordinates } from '../geo';
import { PAYMENTS } from '../constants';

const vehicleDimensionSchema = z
  .number({ invalid_type_error: 'Maşın ölçüsü rəqəm olmalıdır' })
  .positive('Maşın ölçüsü 0-dan böyük olmalıdır')
  .max(30, 'Maşın ölçüsü maksimum 30 m ola bilər');

export const latitudeSchema = z
  .number({ invalid_type_error: 'Enlik rəqəm olmalıdır' })
  .min(-90, 'Enlik -90…90 aralığında olmalıdır')
  .max(90, 'Enlik -90…90 aralığında olmalıdır');

export const longitudeSchema = z
  .number({ invalid_type_error: 'Uzunluq rəqəm olmalıdır' })
  .min(-180, 'Uzunluq -180…180 aralığında olmalıdır')
  .max(180, 'Uzunluq -180…180 aralığında olmalıdır');

export const headingSchema = z
  .number({ invalid_type_error: 'İstiqamət rəqəm olmalıdır' })
  .min(0, 'İstiqamət 0…360 aralığında olmalıdır')
  .max(360, 'İstiqamət 0…360 aralığında olmalıdır');

/** Cüt lat/lng — biri göndərilibsə digəri də məcburidir */
function withOptionalCoordPairs<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>,
  pairs: Array<{ latKey: keyof T & string; lngKey: keyof T & string; label: string }>,
) {
  return schema.superRefine((data, ctx) => {
    const record = data as Record<string, unknown>;
    for (const { latKey, lngKey, label } of pairs) {
      const lat = record[latKey];
      const lng = record[lngKey];
      const hasLat = lat !== undefined && lat !== null;
      const hasLng = lng !== undefined && lng !== null;
      if (hasLat !== hasLng) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${label} üçün həm enlik, həm uzunluq lazımdır`,
          path: [hasLat ? lngKey : latKey],
        });
        continue;
      }
      if (hasLat && hasLng && typeof lat === 'number' && typeof lng === 'number') {
        if (!isValidCoordinates(lat, lng)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `${label} koordinatları etibarsızdır`,
            path: [latKey],
          });
        }
      }
    }
  });
}

const timeHhMmSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Saat HH:mm formatında olmalıdır');

const dateYmdSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Tarix YYYY-MM-DD formatında olmalıdır');

export const emailSchema = z.string().email('Düzgün e-poçt daxil edin');
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
  captchaToken: z.string().optional(),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Şifrə tələb olunur'),
  captchaToken: z.string().optional(),
});

const verificationCodeSchema = z
  .string()
  .length(6, 'Təsdiq kodu 6 rəqəm olmalıdır')
  .regex(/^\d{6}$/, 'Təsdiq kodu yalnız rəqəmlərdən ibarət olmalıdır');

export const forgotPasswordSchema = z.object({
  email: emailSchema,
  captchaToken: z.string().optional(),
});

export const resetPasswordSchema = z
  .object({
    email: emailSchema,
    code: verificationCodeSchema,
    newPassword: passwordSchema,
    confirmNewPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: 'Şifrələr uyğun gəlmir',
    path: ['confirmNewPassword'],
  });

export const requestEmailVerificationSchema = z.object({
  email: emailSchema,
});

export const confirmEmailVerificationSchema = z.object({
  email: emailSchema,
  code: verificationCodeSchema,
});

export const logoutSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token tələb olunur'),
});

const imageUrlSchema = z
  .string()
  .max(2048, 'Şəkil URL çox uzundur')
  .refine(
    (val) => val.startsWith('http://') || val.startsWith('https://'),
    'Şəkil əvvəlcə yüklənməlidir (http/https URL)',
  );

/** Xidmət elanına əlavə oluna bilən maksimum şəkil sayı */
export const MAX_SERVICE_IMAGES = 3;

const serviceImagesSchema = z
  .array(imageUrlSchema)
  .min(1, 'Ən azı 1 şəkil əlavə edin')
  .max(MAX_SERVICE_IMAGES, `Maksimum ${MAX_SERVICE_IMAGES} şəkil əlavə etmək olar`);

export const createServiceSchema = z.object({
  title: z.string().min(3, 'Xidmət növü minimum 3 simvol olmalıdır').max(200),
  description: z.string().min(10, 'Təsvir minimum 10 simvol olmalıdır').max(5000),
  categoryId: z.string().uuid('Kateqoriya seçin'),
  price: z.number().min(0, 'Qiymət mənfi ola bilməz'),
  priceUnit: z.enum(PRICE_UNIT_VALUES).default(PriceUnit.FIXED),
  duration: z.number().int().positive().optional(),
  location: z.string().min(1, 'Ünvan seçin'),
  isRemote: z.boolean().default(false),
  serviceVenue: z.enum(SERVICE_VENUE_VALUES).optional(),
  vehicleLength: vehicleDimensionSchema.optional(),
  vehicleWidth: vehicleDimensionSchema.optional(),
  vehicleHeight: vehicleDimensionSchema.optional(),
  cargoRouteScope: z.enum(CARGO_ROUTE_SCOPE_VALUES).optional(),
  images: serviceImagesSchema,
});

export const createBookingSchema = withOptionalCoordPairs(
  z.object({
    serviceId: z.string().uuid(),
    /** SCHEDULED üçün məcburi; INSTANT-da opsional (server ofset təyin edir) */
    scheduledAt: z.string().datetime().optional(),
    notes: z.string().trim().min(1, 'Qeyd yazın').max(1000),
    address: z.string().trim().min(1, 'Ünvan daxil edin').max(500).optional(),
    imageUrl: imageUrlSchema.optional(),
    /** Default SCHEDULED. INSTANT → avto-dispatch (Faza 4). */
    type: z.nativeEnum(BookingType).optional(),
    destLat: latitudeSchema.optional(),
    destLng: longitudeSchema.optional(),
    originLat: latitudeSchema.optional(),
    originLng: longitudeSchema.optional(),
  }),
  [
    { latKey: 'destLat', lngKey: 'destLng', label: 'Təyinat' },
    { latKey: 'originLat', lngKey: 'originLng', label: 'Mənşə' },
  ],
).superRefine((data, ctx) => {
  const type = data.type ?? BookingType.SCHEDULED;
  if (type === BookingType.SCHEDULED) {
    if (!data.scheduledAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Sifariş tarixi tələb olunur',
        path: ['scheduledAt'],
      });
    }
  }
  if (type === BookingType.INSTANT) {
    const hasDest =
      data.destLat !== undefined &&
      data.destLat !== null &&
      data.destLng !== undefined &&
      data.destLng !== null;
    if (!hasDest) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Ani sifariş üçün təyinat koordinatları məcburidir',
        path: ['destLat'],
      });
    }
  }
});

export const updateProviderLocationSchema = z.object({
  lat: latitudeSchema,
  lng: longitudeSchema,
  heading: headingSchema.optional(),
  availability: z.nativeEnum(ProviderAvailability).optional(),
});

export const updateProviderAvailabilitySchema = z.object({
  availability: z.nativeEnum(ProviderAvailability, {
    errorMap: () => ({ message: 'Əlçatanlıq statusu seçin' }),
  }),
});

export const nearbyProvidersQuerySchema = z.object({
  lat: latitudeSchema,
  lng: longitudeSchema,
  radiusKm: z.coerce.number().min(0.1, 'Radius minimum 0.1 km').max(100, 'Radius maksimum 100 km').default(10),
  categoryId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const geocodeQuerySchema = z.object({
  q: z.string().trim().min(2, 'Axtarış ən azı 2 simvol olmalıdır').max(200),
});

export const reverseGeocodeQuerySchema = z.object({
  lat: latitudeSchema,
  lng: longitudeSchema,
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
  price: z.number().min(0, 'Qiymət mənfi ola bilməz').optional(),
  priceUnit: z.enum(PRICE_UNIT_VALUES).optional(),
  location: z.string().min(1, 'Ünvan seçin').optional(),
  isRemote: z.boolean().optional(),
  serviceVenue: z.enum(SERVICE_VENUE_VALUES).optional(),
  vehicleLength: vehicleDimensionSchema.optional(),
  vehicleWidth: vehicleDimensionSchema.optional(),
  vehicleHeight: vehicleDimensionSchema.optional(),
  cargoRouteScope: z.enum(CARGO_ROUTE_SCOPE_VALUES).optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED']).optional(),
  /** Göndərildikdə mövcud şəkilləri tam əvəz edir */
  images: serviceImagesSchema.optional(),
});

export const updateProfileSchema = z.object({
  firstName: z.string().min(2, 'Ad minimum 2 simvol olmalıdır').optional(),
  lastName: z.string().min(2, 'Soyad minimum 2 simvol olmalıdır').optional(),
  phone: z.union([phoneSchema, z.literal('')]).optional(),
  avatarUrl: z.union([imageUrlSchema, z.literal(''), z.null()]).optional(),
  experience: z
    .number()
    .int('Təcrübə tam rəqəm olmalıdır')
    .min(0, 'Təcrübə mənfi ola bilməz')
    .max(50, 'Təcrübə maksimum 50 il ola bilər')
    .optional(),
  bio: z
    .union([
      z.string().max(1000, 'Bio maksimum 1000 simvol ola bilər'),
      z.literal(''),
    ])
    .optional(),
  location: z.union([z.string().min(1, 'Ünvan seçin'), z.literal('')]).optional(),
});

export const contactSubjectValues = [
  'general',
  'provider',
  'technical',
  'partnership',
  'other',
] as const;

export const contactSubjectLabels: Record<(typeof contactSubjectValues)[number], string> = {
  general: 'Ümumi sual',
  provider: 'Xidmət verən dəstəyi',
  technical: 'Texniki problem',
  partnership: 'Əməkdaşlıq təklifi',
  other: 'Digər',
};

export const contactFormSchema = z.object({
  name: z.string().min(2, 'Ad minimum 2 simvol olmalıdır').max(100),
  email: emailSchema,
  phone: z.string().max(30).optional(),
  subject: z.enum(contactSubjectValues, {
    errorMap: () => ({ message: 'Mövzu seçin' }),
  }),
  message: z
    .string()
    .min(10, 'Mesaj minimum 10 simvol olmalıdır')
    .max(2000, 'Mesaj maksimum 2000 simvol ola bilər'),
  captchaToken: z.string().optional(),
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

/** Hesab soft-delete — şifrə təsdiqi */
export const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Şifrə tələb olunur'),
  confirmText: z
    .string()
    .refine((v) => v.trim().toUpperCase() === 'SIL', {
      message: 'Təsdiq üçün SIL yazın',
    }),
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

export const workingHoursEntrySchema = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6),
    startTime: timeHhMmSchema,
    endTime: timeHhMmSchema,
    isActive: z.boolean().default(true),
  })
  .refine((data) => data.startTime < data.endTime, {
    message: 'Başlama saati bitmə saatından əvvəl olmalıdır',
    path: ['endTime'],
  });

export const upsertWorkingHoursSchema = z.object({
  hours: z.array(workingHoursEntrySchema).max(21),
});

export const createAvailabilityOverrideSchema = z
  .object({
    date: dateYmdSchema,
    startTime: timeHhMmSchema.optional().nullable(),
    endTime: timeHhMmSchema.optional().nullable(),
    type: z.nativeEnum(AvailabilityOverrideType),
    note: z.string().max(500).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    const hasStart = Boolean(data.startTime);
    const hasEnd = Boolean(data.endTime);
    if (hasStart !== hasEnd) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Başlama və bitmə saatı birlikdə daxil edilməlidir',
        path: hasStart ? ['endTime'] : ['startTime'],
      });
      return;
    }
    if (hasStart && hasEnd && data.startTime && data.endTime && data.startTime >= data.endTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Başlama saati bitmə saatından əvvəl olmalıdır',
        path: ['endTime'],
      });
    }
  });

export const availabilityQuerySchema = z.object({
  from: dateYmdSchema,
  to: dateYmdSchema,
});

export const createCategorySchema = z.object({
  name: z.string().min(2, 'Ad minimum 2 simvol olmalıdır').max(100),
  slug: z
    .string()
    .min(2)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug yalnız kiçik hərf, rəqəm və tire ola bilər')
    .optional(),
  description: z.string().max(2000).optional(),
  icon: z.string().max(32).optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
  isActive: z.boolean().optional(),
});

export const updateCategorySchema = createCategorySchema.partial().extend({
  name: z.string().min(2).max(100).optional(),
});

export const adminSetUserActiveSchema = z.object({
  isActive: z.boolean(),
});

export const adminSetProviderVerifiedSchema = z.object({
  isVerified: z.boolean(),
});

export const adminSetServiceStatusSchema = z.object({
  status: z.nativeEnum(ServiceStatus),
});

export const adminSetReviewStatusSchema = z.object({
  status: z.enum([ReviewStatus.APPROVED, ReviewStatus.REJECTED]),
});

export const adminAnnouncementSchema = z.object({
  title: z.string().min(3, 'Başlıq minimum 3 simvol olmalıdır').max(200),
  body: z.string().min(5, 'Mətn minimum 5 simvol olmalıdır').max(2000),
  /** Boş = bütün aktiv istifadəçilər; əks halda yalnız bu rollar */
  roles: z.array(z.enum([UserRole.CUSTOMER, UserRole.PROVIDER])).min(1).optional(),
});

export const adminUsersQuerySchema = paginationSchema.extend({
  role: z.nativeEnum(UserRole).optional(),
  isActive: z.coerce.boolean().optional(),
  search: z.string().max(100).optional(),
});

export const adminServicesQuerySchema = paginationSchema.extend({
  status: z.nativeEnum(ServiceStatus).optional(),
  categoryId: z.string().uuid().optional(),
  search: z.string().max(100).optional(),
});

export const adminBookingsQuerySchema = paginationSchema.extend({
  status: z.nativeEnum(BookingStatus).optional(),
});

export const adminReviewsQuerySchema = paginationSchema.extend({
  status: z.nativeEnum(ReviewStatus).optional(),
});

export const reportReasonLabels = {
  [ReportReason.SPAM]: 'Spam',
  [ReportReason.FRAUD]: 'Fırıldaqçılıq',
  [ReportReason.ABUSE]: 'Təhqir / təzyiq',
  [ReportReason.INAPPROPRIATE]: 'Uyğunsuz məzmun',
  [ReportReason.NO_SHOW]: 'Gəlməmə / yerinə yetirməmə',
  [ReportReason.OTHER]: 'Digər',
} as const;

export const createReportSchema = z.object({
  targetType: z.nativeEnum(ReportTargetType, {
    errorMap: () => ({ message: 'Hədəf növü seçin' }),
  }),
  targetId: z
    .union([z.string().uuid('Düzgün ID daxil edin'), z.literal('')])
    .optional(),
  reason: z.nativeEnum(ReportReason, {
    errorMap: () => ({ message: 'Səbəb seçin' }),
  }),
  description: z
    .string()
    .min(10, 'Təsvir minimum 10 simvol olmalıdır')
    .max(2000, 'Təsvir maksimum 2000 simvol ola bilər'),
});

export const adminSetReportStatusSchema = z.object({
  status: z.enum([ReportStatus.RESOLVED, ReportStatus.DISMISSED]),
  adminNote: z.string().max(1000).optional(),
});

export const adminReportsQuerySchema = paginationSchema.extend({
  status: z.nativeEnum(ReportStatus).optional(),
});

export const registerDeviceTokenSchema = z.object({
  token: z
    .string()
    .min(32, 'Cihaz tokeni çox qısadır')
    .max(4096, 'Cihaz tokeni çox uzundur'),
  platform: z.nativeEnum(DevicePlatform, {
    errorMap: () => ({ message: 'Platforma seçin (WEB, ANDROID, IOS)' }),
  }),
});

export const unregisterDeviceTokenSchema = z.object({
  token: z
    .string()
    .min(32, 'Cihaz tokeni çox qısadır')
    .max(4096, 'Cihaz tokeni çox uzundur'),
});

export const createPaymentIntentSchema = z.object({
  bookingId: z.string().uuid('Sifariş ID düzgün deyil').optional(),
  amount: z
    .number({ invalid_type_error: 'Məbləğ rəqəm olmalıdır' })
    .positive('Məbləğ 0-dan böyük olmalıdır')
    .max(1_000_000, 'Məbləğ çox böyükdür'),
  currency: z
    .string()
    .length(3, 'Valyuta 3 hərfli kod olmalıdır')
    .default(PAYMENTS.DEFAULT_CURRENCY)
    .optional(),
  idempotencyKey: z
    .string()
    .min(8, 'İdempotency açarı minimum 8 simvol olmalıdır')
    .max(PAYMENTS.IDEMPOTENCY_KEY_MAX_LEN, 'İdempotency açarı çox uzundur')
    .optional(),
});

export const paymentActionSchema = z.object({
  idempotencyKey: z
    .string()
    .min(8, 'İdempotency açarı minimum 8 simvol olmalıdır')
    .max(PAYMENTS.IDEMPOTENCY_KEY_MAX_LEN, 'İdempotency açarı çox uzundur')
    .optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type RequestEmailVerificationInput = z.infer<typeof requestEmailVerificationSchema>;
export type ConfirmEmailVerificationInput = z.infer<typeof confirmEmailVerificationSchema>;
export type LogoutInput = z.infer<typeof logoutSchema>;
export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type RescheduleBookingInput = z.infer<typeof rescheduleBookingSchema>;
export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ContactFormInput = z.infer<typeof contactFormSchema>;
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;
export type RequestEmailChangeInput = z.infer<typeof requestEmailChangeSchema>;
export type ConfirmEmailChangeInput = z.infer<typeof confirmEmailChangeSchema>;
export type CreateConversationInput = z.infer<typeof createConversationSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type UpsertWorkingHoursInput = z.infer<typeof upsertWorkingHoursSchema>;
export type CreateAvailabilityOverrideInput = z.infer<typeof createAvailabilityOverrideSchema>;
export type AvailabilityQueryInput = z.infer<typeof availabilityQuerySchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type AdminSetUserActiveInput = z.infer<typeof adminSetUserActiveSchema>;
export type AdminSetProviderVerifiedInput = z.infer<typeof adminSetProviderVerifiedSchema>;
export type AdminSetServiceStatusInput = z.infer<typeof adminSetServiceStatusSchema>;
export type AdminSetReviewStatusInput = z.infer<typeof adminSetReviewStatusSchema>;
export type AdminAnnouncementInput = z.infer<typeof adminAnnouncementSchema>;
export type CreateReportInput = z.infer<typeof createReportSchema>;
export type AdminSetReportStatusInput = z.infer<typeof adminSetReportStatusSchema>;
export type UpdateProviderLocationInput = z.infer<typeof updateProviderLocationSchema>;
export type UpdateProviderAvailabilityInput = z.infer<typeof updateProviderAvailabilitySchema>;
export type NearbyProvidersQueryInput = z.infer<typeof nearbyProvidersQuerySchema>;
export type GeocodeQueryInput = z.infer<typeof geocodeQuerySchema>;
export type ReverseGeocodeQueryInput = z.infer<typeof reverseGeocodeQuerySchema>;
export type RegisterDeviceTokenInput = z.infer<typeof registerDeviceTokenSchema>;
export type UnregisterDeviceTokenInput = z.infer<typeof unregisterDeviceTokenSchema>;
export type CreatePaymentIntentInput = z.infer<typeof createPaymentIntentSchema>;
export type PaymentActionInput = z.infer<typeof paymentActionSchema>;
