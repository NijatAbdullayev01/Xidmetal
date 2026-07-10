import {
  BrushCleaning,
  Wrench,
  Scissors,
  GraduationCap,
  Car,
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
  tehsil: GraduationCap,
  neqliyyat: Car,
  'it-xidmetleri': Monitor,
  'foto-video': Camera,
  qidalanma: ChefHat,
};

export function getCategoryIcon(slug: string): LucideIcon {
  return CATEGORY_ICONS[slug] ?? LayoutGrid;
}
