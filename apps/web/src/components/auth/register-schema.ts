import { z } from 'zod';
import { phoneSchema, registerSchema, UserRole } from '@xidmetal/shared';

const publicRoles = [UserRole.CUSTOMER, UserRole.PROVIDER] as const;

export const registerFormSchema = registerSchema
  .omit({ role: true, phone: true })
  .extend({
    confirmPassword: z.string().min(1, 'Şifrəni təkrar daxil edin'),
    role: z.enum(publicRoles, {
      errorMap: () => ({ message: 'Hesab növünü seçin' }),
    }),
    phone: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Şifrələr uyğun gəlmir',
        path: ['confirmPassword'],
      });
    }

    const phone = data.phone?.trim();
    if (phone) {
      const phoneResult = phoneSchema.safeParse(phone);
      if (!phoneResult.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: phoneResult.error.issues[0]?.message ?? 'Düzgün telefon nömrəsi daxil edin',
          path: ['phone'],
        });
      }
    }
  });

export type RegisterFormValues = z.infer<typeof registerFormSchema>;
export type PublicUserRole = (typeof publicRoles)[number];
