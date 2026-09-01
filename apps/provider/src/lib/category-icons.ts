import {
  BrushCleaning,
  Wrench,
  Scissors,
  Bug,
  GraduationCap,
  Car,
  Package,
  Monitor,
  Camera,
  ChefHat,
  LayoutGrid,
  type LucideIcon,
} from 'lucide-react';

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  temizlik: BrushCleaning,
  temir: Wrench,
  gozellik: Scissors,
  dezinfeksiya: Bug,
  tehsil: GraduationCap,
  neqliyyat: Car,
  catdirilma: Package,
  'it-xidmetleri': Monitor,
  'foto-video': Camera,
  qidalanma: ChefHat,
};

export function getCategoryIcon(slug: string): LucideIcon {
  return CATEGORY_ICONS[slug] ?? LayoutGrid;
}
