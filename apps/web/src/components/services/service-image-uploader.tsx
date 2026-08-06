'use client';

import { useRef, useState } from 'react';
import { Camera, Trash2, X } from 'lucide-react';
import { MAX_SERVICE_IMAGES } from '@xidmetal/shared';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { uploadImage, ApiError } from '@/lib/api';
import { useAuthToken } from '@/hooks/use-auth-token';

const MAX_IMAGE_SIZE_BYTES = 1 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

interface ServiceImageUploaderProps {
  images: string[];
  onChange: (images: string[]) => void;
  disabled?: boolean;
  id?: string;
  className?: string;
  error?: string | null;
  label?: string;
  hint?: string;
}

export function ServiceImageUploader({
  images,
  onChange,
  disabled = false,
  id = 'service-images',
  className,
  error: externalError = null,
  label = 'İş nümunəsi şəkilləri',
  hint,
}: ServiceImageUploaderProps) {
  const token = useAuthToken();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const canAddMore = images.length < MAX_SERVICE_IMAGES;
  const displayError = error ?? externalError;
  const hintText =
    hint ??
    `Xidmətinizi göstərən ən azı 1 şəkil əlavə edin. JPG, PNG və ya WEBP, hər biri maksimum 1 MB. Ən çox ${MAX_SERVICE_IMAGES} şəkil.`;

  const handleSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (files.length === 0) return;

    setError(null);

    if (!token) {
      setError('Şəkil yükləmək üçün daxil olun');
      return;
    }

    const remaining = MAX_SERVICE_IMAGES - images.length;
    if (remaining <= 0) {
      setError(`Maksimum ${MAX_SERVICE_IMAGES} şəkil əlavə etmək olar`);
      return;
    }

    const selected = files.slice(0, remaining);
    for (const file of selected) {
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
        setError('Yalnız JPG, PNG və ya WEBP formatı qəbul edilir');
        return;
      }
      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        setError('Hər şəkil maksimum 1 MB ola bilər');
        return;
      }
    }

    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of selected) {
        uploaded.push(await uploadImage(token, file, 'services'));
      }
      onChange([...images, ...uploaded]);
      if (files.length > remaining) {
        setError(`Maksimum ${MAX_SERVICE_IMAGES} şəkil əlavə etmək olar`);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Şəkil yüklənmədi');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = (index: number) => {
    setError(null);
    onChange(images.filter((_, i) => i !== index));
  };

  return (
    <div className={cn('space-y-3', className)}>
      <div className="space-y-1">
        <Label htmlFor={id}>{label}</Label>
        <p className="text-xs text-muted-foreground">{hintText}</p>
      </div>

      <div className="flex flex-wrap gap-3">
        {images.map((url, index) => (
          <div
            key={`${url}-${index}`}
            className="relative h-24 w-24 overflow-hidden rounded-lg border border-border"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => handleRemove(index)}
              disabled={disabled || uploading}
              className="absolute top-1 right-1 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
              aria-label="Şəkli sil"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}

        {canAddMore && (
          <button
            type="button"
            id={id}
            disabled={disabled || uploading}
            onClick={() => fileInputRef.current?.click()}
            className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border text-muted-foreground hover:border-brand hover:text-foreground disabled:opacity-50"
          >
            <Camera className="h-5 w-5" />
            <span className="text-xs">{uploading ? 'Yüklənir…' : 'Əlavə et'}</span>
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(',')}
        multiple
        className="hidden"
        onChange={(event) => void handleSelect(event)}
      />

      {displayError && (
        <p className="text-sm text-destructive" role="alert">
          {displayError}
        </p>
      )}

      {images.length > 0 && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled || uploading}
          onClick={() => onChange([])}
          className="text-muted-foreground"
        >
          <Trash2 className="h-4 w-4" />
          Hamısını sil
        </Button>
      )}
    </div>
  );
}
