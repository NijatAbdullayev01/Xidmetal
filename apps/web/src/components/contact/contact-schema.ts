import { emailSchema } from '@xidmetal/shared';
import { z } from 'zod';

export const contactSubjectValues = [
  'general',
  'provider',
  'technical',
  'partnership',
  'other',
] as const;

export type ContactSubject = (typeof contactSubjectValues)[number];

export const contactSubjectLabels: Record<ContactSubject, string> = {
  general: 'Ümumi sual',
  provider: 'Xidmət verən dəstəyi',
  technical: 'Texniki problem',
  partnership: 'Əməkdaşlıq təklifi',
  other: 'Digər',
};

export const contactFormSchema = z.object({
  name: z.string().min(2, 'Ad minimum 2 simvol olmalıdır'),
  email: emailSchema,
  phone: z.string().optional(),
  subject: z.enum(contactSubjectValues, {
    errorMap: () => ({ message: 'Mövzu seçin' }),
  }),
  message: z
    .string()
    .min(10, 'Mesaj minimum 10 simvol olmalıdır')
    .max(2000, 'Mesaj maksimum 2000 simvol ola bilər'),
});

export type ContactFormValues = z.infer<typeof contactFormSchema>;
