import { SettingsForm } from '@/components/settings/settings-form';
import { ProviderKycCard } from '@/components/settings/provider-kyc-card';

export default function ProviderSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tənzimləmələr</h1>
        <p className="mt-1 text-muted-foreground">
          Profil məlumatlarınızı, şəxsiyyət sənədlərini və şifrənizi idarə edin.
        </p>
      </div>
      <ProviderKycCard />
      <SettingsForm />
    </div>
  );
}
