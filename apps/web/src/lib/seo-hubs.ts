import { categoryLocationPath } from '@xidmetal/shared';

/** Footer və ana səhifə daxili linkləri — Google crawl equity. */
export const PUBLIC_CATEGORY_HUBS = [
  { slug: 'temizlik', name: 'Təmizlik' },
  { slug: 'temir', name: 'Təmir' },
  { slug: 'gozellik', name: 'Gözəllik' },
  { slug: 'dezinfeksiya', name: 'Dezinfeksiya' },
  { slug: 'neqliyyat', name: 'Nəqliyyat' },
  { slug: 'catdirilma', name: 'Çatdırılma' },
] as const;

const BAKU = 'Bakı';

export function bakuCategoryPath(slug: string): string {
  return categoryLocationPath(slug, BAKU);
}
