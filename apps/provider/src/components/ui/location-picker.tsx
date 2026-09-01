'use client';

import { useMemo } from 'react';
import { MapPin } from 'lucide-react';
import {
  AZERBAIJAN_PICKER_LOCATIONS,
  BAKU_CITY,
  BAKU_DISTRICT_LOCATIONS,
  bakuDistrictDisplayName,
  parsePickerLocation,
} from '@xidmetal/shared';
import { Label } from '@/components/ui/label';
import { Select, type SelectOption } from '@/components/ui/select';
import { cn } from '@/lib/utils';

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
  /**
   * Xidmət alan ünvanı: Bakı seçiləndə daxili inzibati rayon ayrıca dropdown-da məcburidir.
   * Xidmət ərazisi (xidmət verən formları) üçün false saxla.
   */
  requireBakuDistrict?: boolean;
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
  requireBakuDistrict = false,
  className,
}: LocationPickerProps) {
  const { city, district } = parsePickerLocation(value);
  const districtId = id ? `${id}-district` : undefined;
  const showDistrict = requireBakuDistrict && city === BAKU_CITY;
  const cityError = error && !showDistrict;
  const districtError = error && showDistrict && !district;

  const cityOptions = useMemo((): SelectOption[] => {
    const known = new Set(AZERBAIJAN_PICKER_LOCATIONS);
    const extras = extraOptions.filter((item) => item && !known.has(item));
    if (city && !known.has(city) && !extras.includes(city)) {
      extras.unshift(city);
    }

    return [...extras, ...AZERBAIJAN_PICKER_LOCATIONS].map((location) => ({
      value: location,
      label: location,
      icon: MapPin,
    }));
  }, [extraOptions, city]);

  const districtOptions = useMemo(
    (): SelectOption[] =>
      BAKU_DISTRICT_LOCATIONS.map((location) => ({
        value: location,
        label: bakuDistrictDisplayName(location),
        icon: MapPin,
      })),
    [],
  );

  const handleCityChange = (nextCity: string) => {
    if (!nextCity) {
      onChange('');
      return;
    }
    if (requireBakuDistrict && nextCity === BAKU_CITY) {
      onChange(BAKU_CITY);
      return;
    }
    onChange(nextCity);
  };

  const citySelect = (
    <Select
      id={id}
      value={city}
      onChange={handleCityChange}
      options={cityOptions}
      placeholder={placeholder}
      disabled={disabled}
      error={cityError}
      searchable
      searchPlaceholder="Şəhər və ya rayon axtarın..."
      clearable={clearable}
      clearLabel="Seçimi sil"
      triggerIcon={MapPin}
      ariaLabel="Ünvan seçimi"
      className={requireBakuDistrict ? undefined : className}
    />
  );

  if (!requireBakuDistrict) {
    return citySelect;
  }

  return (
    <div className={cn('space-y-4', className)}>
      {citySelect}
      {showDistrict ? (
        <div className="space-y-2">
          <Label htmlFor={districtId}>Bakı rayonu</Label>
          <Select
            id={districtId}
            value={district}
            onChange={onChange}
            options={districtOptions}
            placeholder="Rayon seçin"
            disabled={disabled}
            error={districtError}
            searchable
            searchPlaceholder="Rayon axtarın..."
            clearable={false}
            triggerIcon={MapPin}
            ariaLabel="Bakı rayonu"
          />
        </div>
      ) : null}
    </div>
  );
}
