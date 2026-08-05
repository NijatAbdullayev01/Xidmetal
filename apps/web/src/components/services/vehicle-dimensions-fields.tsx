'use client';

import { Ruler } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface VehicleDimensionsFieldsProps {
  length?: number;
  width?: number;
  height?: number;
  onLengthChange: (value: number | undefined) => void;
  onWidthChange: (value: number | undefined) => void;
  onHeightChange: (value: number | undefined) => void;
  errors?: {
    length?: string;
    width?: string;
    height?: string;
  };
  disabled?: boolean;
}

function parseDimension(raw: string): number | undefined {
  if (raw.trim() === '') return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

export function VehicleDimensionsFields({
  length,
  width,
  height,
  onLengthChange,
  onWidthChange,
  onHeightChange,
  errors,
  disabled,
}: VehicleDimensionsFieldsProps) {
  return (
    <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-4">
      <div className="flex items-start gap-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/20 text-brand-dark">
          <Ruler className="h-4 w-4" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold">Maşın ölçüləri</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Yük yerinin ölçülərini metr ilə qeyd edin (uzunluq × en × hündürlük).
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="vehicleLength">Uzunluq (m)</Label>
          <Input
            id="vehicleLength"
            type="number"
            min="0.1"
            max="30"
            step="0.1"
            placeholder="2.5"
            inputMode="decimal"
            disabled={disabled}
            error={!!errors?.length}
            value={length ?? ''}
            onChange={(event) => onLengthChange(parseDimension(event.target.value))}
            className="min-h-[44px]"
          />
          {errors?.length ? (
            <p className="text-sm text-destructive">{errors.length}</p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="vehicleWidth">En (m)</Label>
          <Input
            id="vehicleWidth"
            type="number"
            min="0.1"
            max="30"
            step="0.1"
            placeholder="1.5"
            inputMode="decimal"
            disabled={disabled}
            error={!!errors?.width}
            value={width ?? ''}
            onChange={(event) => onWidthChange(parseDimension(event.target.value))}
            className="min-h-[44px]"
          />
          {errors?.width ? (
            <p className="text-sm text-destructive">{errors.width}</p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="vehicleHeight">Hündürlük (m)</Label>
          <Input
            id="vehicleHeight"
            type="number"
            min="0.1"
            max="30"
            step="0.1"
            placeholder="1.8"
            inputMode="decimal"
            disabled={disabled}
            error={!!errors?.height}
            value={height ?? ''}
            onChange={(event) => onHeightChange(parseDimension(event.target.value))}
            className="min-h-[44px]"
          />
          {errors?.height ? (
            <p className="text-sm text-destructive">{errors.height}</p>
          ) : null}
        </div>
      </div>

      <p
        className={cn(
          'text-xs text-muted-foreground',
          (errors?.length || errors?.width || errors?.height) && 'sr-only',
        )}
      >
        Müştərilər yükün sizin maşınıza sığacağını bilmək üçün bu ölçülərə baxacaq.
      </p>
    </div>
  );
}
