'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  contactFormSchema,
  contactSubjectLabels,
  contactSubjectValues,
  type ContactFormInput,
} from '@xidmetal/shared';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { api, ApiError } from '@/lib/api';
import {
  TurnstileWidget,
  isTurnstileConfigured,
} from '@/components/auth/turnstile-widget';

export function ContactForm() {
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [honeypot, setHoneypot] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ContactFormInput>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      subject: 'general',
      message: '',
    },
  });

  const subject = watch('subject');

  const onSubmit = async (values: ContactFormInput) => {
    setServerError(null);

    if (isTurnstileConfigured() && !captchaToken) {
      setServerError('Təhlükəsizlik yoxlamasını tamamlayın');
      return;
    }

    try {
      await api.contact.submit({
        name: values.name.trim(),
        email: values.email.trim(),
        phone: values.phone?.trim() || undefined,
        subject: values.subject,
        message: values.message.trim(),
        website: honeypot,
        captchaToken: captchaToken ?? undefined,
      });
      setSubmitted(true);
      reset();
      setHoneypot('');
      setCaptchaToken(null);
    } catch (error) {
      setServerError(
        error instanceof ApiError
          ? error.message
          : 'Mesaj göndərilmədi. Bir az sonra yenidən cəhd edin.',
      );
    }
  };

  if (submitted) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand/20">
          <CheckCircle2 className="h-7 w-7 text-brand-dark" aria-hidden />
        </div>
        <h2 className="mt-6 text-xl font-semibold">Mesajınız göndərildi</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Komandamız ən qısa müddətdə sizinlə əlaqə saxlayacaq. Təşəkkür edirik!
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
      className="relative rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8"
      noValidate
    >
      <h2 className="text-xl font-semibold">Bizə yazın</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Formu doldurun — mesajınız birbaşa komandamıza çatacaq.
      </p>

      <div className="mt-6 space-y-5">
        {/* Honeypot — ekrandan gizlədilmiş; botlar doldurur */}
        <div
          className="absolute -left-[9999px] h-0 w-0 overflow-hidden"
          aria-hidden="true"
        >
          <label htmlFor="contact-website">Website</label>
          <input
            id="contact-website"
            name="website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
          />
        </div>

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
          <Select
            id="contact-subject"
            value={subject}
            onChange={(next) =>
              setValue('subject', next as ContactFormInput['subject'], {
                shouldValidate: true,
                shouldDirty: true,
              })
            }
            options={contactSubjectValues.map((value) => ({
              value,
              label: contactSubjectLabels[value],
            }))}
            error={!!errors.subject}
          />
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

        <TurnstileWidget onToken={setCaptchaToken} className="min-h-[65px]" />

        {serverError ? (
          <p className="text-sm text-destructive" role="alert">
            {serverError}
          </p>
        ) : null}

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
