'use client';

import { UserRole } from '@xidmetal/shared';
import { MessagesPanel } from '@/components/messages/messages-panel';

export default function ProviderMessagesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mesajlarım</h1>
        <p className="mt-1 text-muted-foreground">
          Müştərilərlə yazışmalarınızı buradan idarə edin.
        </p>
      </div>
      <MessagesPanel role={UserRole.PROVIDER} />
    </div>
  );
}
