'use client';

import { useRef, useState } from 'react';
import { Camera, Trash2, X } from 'lucide-react';
import { MAX_SERVICE_IMAGES } from '@xidmetal/shared';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const MAX_IMAGE_SIZE_BYTES = 1 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

interface ServiceImageUploaderProps {
  images: string[];
  onChange: (images: string[]) => void;
  disabled?: boolean;
  id?: string;
  className?: string;
  /** Form validasiya xətası (məs. məcburi sahə) */
  error?: string | null;
}

export function ServiceImageUploader({
  images,
  onChange,
  disabled = false,
  id = 'service-images',
  className,
  error: externalError = null,
}: ServiceImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const canAddMore = images.length < MAX_SERVICE_IMAGES;
  const displayError = error ?? externalError;

  const handleSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (files.length === 0) return;

    setError(null);

    const remaining = MAX_SERVICE_IMAGES - images.length;
    if (remaining <= 0) {
      setError(`Maksimum ${MAX_SERVICE_IMAGES} şəkil əlavə etmək olar`);
      return;
    }

    const selected = files.slice(0, remaining);
    const next: string[] = [];
    let processed = 0;
    let failed = false;

    for (const file of selected) {
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
        setError('Yalnız JPG, PNG və ya WEBP formatı qəbul edilir');
        failed = true;
        break;
      }
      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        setError('Hər şəkil maksimum 1 MB ola bilər');
        failed = true;
        break;
      }
    }

    if (failed) return;

    for (const file of selected) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          next.push(reader.result);
        }
        processed += 1;
        if (processed === selected.length) {
          onChange([...images, ...next]);
          if (files.length > remaining) {
            setError(`Maksimum ${MAX_SERVICE_IMAGES} şəkil əlavə etmək olar`);
          }
        }
      };
      reader.onerror = () => {
        setError('Şəkil oxunarkən xəta baş verdi');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemove = (index: number) => {
    setError(null);
    onChange(images.filter((_, i) => i !== index));
  };

  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={id}>İş nümunəsi şəkilləri</Label>
      <p className="text-sm text-muted-foreground">
        Xidmətinizi göstərən ən azı 1 şəkil əlavə edin. JPG, PNG və ya WEBP, hər biri maksimum 1 MB.
        Ən çox {MAX_SERVICE_IMAGES} şəkil.
      </p>

      <input
        ref={fileInputRef}
        id={id}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(',')}
        multiple
        className="hidden"
        disabled={disabled || !canAddMore}
        onChange={handleSelect}
      />

      {images.length > 0 ? (
        <ul className="flex flex-wrap gap-3">
          {images.map((url, index) => (
            <li
              key={`${index}-${url.slice(0, 32)}`}
              className="relative h-20 w-20 overflow-hidden rounded-xl border border-border bg-muted sm:h-24 sm:w-24"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`Xidmət şəkli ${index + 1}`}
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                disabled={disabled}
                onClick={() => handleRemove(index)}
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-md bg-background/90 text-muted-foreground ring-1 ring-border transition-colors hover:bg-background hover:text-destructive disabled:opacity-50"
                aria-label={`Şəkli sil (${index + 1})`}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </li>
          ))}
          {canAddMore ? (
            <li>
              <button
                type="button"
                disabled={disabled}
                onClick={() => fileInputRef.current?.click()}
                className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border bg-muted/40 text-muted-foreground transition-colors hover:border-brand/50 hover:bg-brand/5 hover:text-foreground disabled:opacity-50 sm:h-24 sm:w-24"
                aria-label="Şəkil əlavə et"
              >
                <Camera className="h-5 w-5" />
                <span className="text-[11px] font-medium">Əlavə et</span>
              </button>
            </li>
          ) : null}
        </ul>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="min-h-[44px] w-full sm:w-auto"
          disabled={disabled}
          onClick={() => fileInputRef.current?.click()}
        >
          <Camera className="h-4 w-4" />
          Şəkil əlavə et
        </Button>
      )}

      {displayError ? (
        <p className="flex items-start gap-1.5 text-sm text-destructive" role="alert">
          <X className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          {displayError}
        </p>
      ) : null}
    </div>
  );
}
