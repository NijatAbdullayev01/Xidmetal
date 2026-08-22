import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { UserRole } from '@xidmetal/shared';
import { MessagesPanel } from '@/components/messages/messages-panel';

export default function CustomerMessagesPage() {
  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="shrink-0">
        <h1 className="text-2xl font-bold tracking-tight">Mesajlarım</h1>
        <p className="mt-1 text-muted-foreground">
          Xidmət verənlərlə yazışmalarınızı buradan idarə edin.
        </p>
      </div>
      <Suspense
        fallback={
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-brand" />
          </div>
        }
      >
        <MessagesPanel role={UserRole.CUSTOMER} />
      </Suspense>
    </div>
  );
}
