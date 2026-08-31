import type { Metadata } from 'next';
import { NOINDEX } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Tezliklə',
  description: 'Xidmətal tezliklə istifadəyə veriləcək.',
  robots: NOINDEX,
};

export default function ComingSoonPage() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand px-4">
      <h1 className="text-center text-[clamp(2.75rem,9vw,5.75rem)] font-black leading-none tracking-tight text-brand-foreground">
        Tezliklə...
      </h1>
    </div>
  );
}
