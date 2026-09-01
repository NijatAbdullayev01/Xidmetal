'use client';

import { ArrowRight } from 'lucide-react';
import { BecomeProviderLink } from '@/components/auth/become-provider-link';
import { buttonStyles } from '@/components/ui/button';
import { getProviderAppUrl } from '@/lib/auth';

export function ProviderGuideHeroCta() {
  return (
    <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
      <BecomeProviderLink className={buttonStyles('default', 'lg')}>
        İndi qeydiyyatdan keç
        <ArrowRight className="h-5 w-5" />
      </BecomeProviderLink>
      <a href={getProviderAppUrl()} className={buttonStyles('outline', 'lg')}>
        Kabinetə keç
      </a>
    </div>
  );
}
