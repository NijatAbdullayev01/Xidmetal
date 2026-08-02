/** Xidmətal brend rəngi */
export const BRAND = {
  primary: '#FFCC00',
  primaryDark: '#E6B800',
  primaryLight: '#FFD633',
  primaryForeground: '#1A1A1A',
} as const;

export const APP = {
  name: 'Xidmətal',
  description: 'Xidmət verənlərlə xidmət alanları bir araya gətirən platforma',
  defaultLocale: 'az',
  supportedLocales: ['az', 'en', 'ru'] as const,
} as const;

export const API = {
  prefix: '/api/v1',
  defaultPageSize: 20,
  maxPageSize: 100,
} as const;

export const PAGINATION = {
  defaultPage: 1,
  defaultLimit: 20,
  maxLimit: 100,
} as const;
