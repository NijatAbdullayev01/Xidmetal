'use client';

import { useMemo } from 'react';
import { MapPin } from 'lucide-react';
import {
  AZERBAIJAN_LOCATION_GROUPS,
  AZERBAIJAN_LOCATIONS,
} from '@xidmetal/shared';
import { Select, type SelectGroup } from '@/components/ui/select';

export interface LocationPickerProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: boolean;
  placeholder?: string;
  /** Seçimi silməyə icazə (məcburi sahələrdə false) */
  clearable?: boolean;
  /** Siyahıda olmayan köhnə/xüsusi dəyərlər */
  extraOptions?: readonly string[];
  className?: string;
}

export function LocationPicker({
  id,
  value,
  onChange,
  disabled = false,
  error = false,
  placeholder = 'Şəhər və ya rayon seçin',
  clearable = true,
  extraOptions = [],
  className,
}: LocationPickerProps) {
  const groups = useMemo((): SelectGroup[] => {
    const known = new Set(AZERBAIJAN_LOCATIONS);
    const extras = extraOptions.filter((item) => item && !known.has(item));

    const base: SelectGroup[] = AZERBAIJAN_LOCATION_GROUPS.map((group) => ({
      label: group.label,
      options: group.locations.map((location) => ({
        value: location,
        label: location,
        icon: MapPin,
      })),
    }));

    if (extras.length === 0) return base;

    return [
      {
        label: 'Digər',
        options: extras.map((location) => ({
          value: location,
          label: location,
          icon: MapPin,
        })),
      },
      ...base,
    ];
  }, [extraOptions]);

  return (
    <Select
      id={id}
      value={value}
      onChange={onChange}
      groups={groups}
      placeholder={placeholder}
      disabled={disabled}
      error={error}
      searchable
      searchPlaceholder="Şəhər və ya rayon axtarın..."
      clearable={clearable}
      clearLabel="Seçimi sil"
      triggerIcon={MapPin}
      ariaLabel="Ünvan seçimi"
      className={className}
    />
  );
}
