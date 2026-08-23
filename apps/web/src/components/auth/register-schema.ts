import { z } from 'zod';
import {
  applyProviderAccountRules,
  applyRegisterNameRules,
  ProviderAccountType,
  registerSchema,
  UserRole,
} from '@xidmetal/shared';

const publicRoles = [UserRole.CUSTOMER, UserRole.PROVIDER] as const;

export const registerFormSchema = registerSchema
  .omit({ role: true })
  .extend({
    confirmPassword: z.string().min(1, 'Şifrəni təkrar daxil edin'),
    role: z.enum(publicRoles, {
      errorMap: () => ({ message: 'Hesab növünü seçin' }),
    }),
    providerAccountType: z.nativeEnum(ProviderAccountType).optional(),
    companyName: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Şifrələr uyğun gəlmir',
        path: ['confirmPassword'],
      });
    }

    applyRegisterNameRules(data, ctx);
    applyProviderAccountRules(data, ctx);
  });

export type RegisterFormValues = z.infer<typeof registerFormSchema>;
export type PublicUserRole = (typeof publicRoles)[number];
