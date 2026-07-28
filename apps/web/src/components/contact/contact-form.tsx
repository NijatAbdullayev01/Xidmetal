'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  contactFormSchema,
  contactSubjectLabels,
  contactSubjectValues,
  type ContactFormValues,
} from '@/components/contact/contact-schema';

const CONTACT_EMAIL = 'info@xidmetal.az';

export function ContactForm() {
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      subject: 'general',
      message: '',
    },
  });

  const onSubmit = async (values: ContactFormValues) => {
    const subjectLabel = contactSubjectLabels[values.subject];
    const body = [
      `Ad: ${values.name}`,
      `E-poçt: ${values.email}`,
      values.phone?.trim() ? `Telefon: ${values.phone.trim()}` : null,
      `Mövzu: ${subjectLabel}`,
      '',
      values.message,
    ]
      .filter(Boolean)
      .join('\n');

    const mailtoUrl = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`[Xidmetal] ${subjectLabel}`)}&body=${encodeURIComponent(body)}`;

    window.location.href = mailtoUrl;
    setSubmitted(true);
    reset();
  };

  if (submitted) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand/20">
          <CheckCircle2 className="h-7 w-7 text-brand-dark" aria-hidden />
        </div>
        <h2 className="mt-6 text-xl font-semibold">Mesajınız hazırdır</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          E-poçt proqramınız açıldı. Mesajı göndərdikdən sonra komandamız ən qısa
          müddətdə sizinlə əlaqə saxlayacaq.
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-6"
          onClick={() => setSubmitted(false)}
        >
          Yeni mesaj göndər
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8"
      noValidate
    >
      <h2 className="text-xl font-semibold">Bizə yazın</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Formu doldurun — mesajınız e-poçt vasitəsilə komandamıza göndəriləcək.
      </p>

      <div className="mt-6 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="contact-name">Ad və soyad</Label>
          <Input
            id="contact-name"
            autoComplete="name"
            placeholder="Adınızı daxil edin"
            error={!!errors.name}
            {...register('name')}
          />
          {errors.name && (
            <p className="text-sm text-destructive" role="alert">
              {errors.name.message}
            </p>
          )}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="contact-email">E-poçt</Label>
            <Input
              id="contact-email"
              type="email"
              autoComplete="email"
              placeholder="email@example.com"
              error={!!errors.email}
              {...register('email')}
            />
            {errors.email && (
              <p className="text-sm text-destructive" role="alert">
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact-phone">
              Telefon <span className="font-normal text-muted-foreground">(istəyə bağlı)</span>
            </Label>
            <Input
              id="contact-phone"
              type="tel"
              autoComplete="tel"
              placeholder="+994 XX XXX XX XX"
              error={!!errors.phone}
              {...register('phone')}
            />
            {errors.phone && (
              <p className="text-sm text-destructive" role="alert">
                {errors.phone.message}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="contact-subject">Mövzu</Label>
          <Select id="contact-subject" error={!!errors.subject} {...register('subject')}>
            {contactSubjectValues.map((value) => (
              <option key={value} value={value}>
                {contactSubjectLabels[value]}
              </option>
            ))}
          </Select>
          {errors.subject && (
            <p className="text-sm text-destructive" role="alert">
              {errors.subject.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="contact-message">Mesaj</Label>
          <Textarea
            id="contact-message"
            rows={5}
            placeholder="Sualınızı və ya təklifinizi buraya yazın..."
            error={!!errors.message}
            {...register('message')}
          />
          {errors.message && (
            <p className="text-sm text-destructive" role="alert">
              {errors.message.message}
            </p>
          )}
        </div>

        <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Göndərilir...
            </>
          ) : (
            'Mesaj göndər'
          )}
        </Button>
      </div>
    </form>
  );
}
