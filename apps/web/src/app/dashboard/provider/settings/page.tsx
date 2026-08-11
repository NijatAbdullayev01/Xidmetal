import { SettingsForm } from '@/components/settings/settings-form';
import { PushNotificationsCard } from '@/components/notifications/push-notifications-card';

export default function ProviderSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tənzimləmələr</h1>
        <p className="mt-1 text-muted-foreground">
          Profil məlumatlarınızı, şəklinizi və şifrənizi idarə edin.
        </p>
      </div>
      <PushNotificationsCard />
      <SettingsForm />
    </div>
  );
}
