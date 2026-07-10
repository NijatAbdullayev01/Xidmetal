'use client';

import { MessageSquare } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function ProviderMessagesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mesajlarım</h1>
        <p className="mt-1 text-muted-foreground">
          Müştərilərlə yazışmalarınızı buradan idarə edin.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-brand/15">
            <MessageSquare className="h-7 w-7 text-brand" />
          </div>
          <p className="font-medium">Hələ mesaj yoxdur</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Müştərilər sizinlə əlaqə saxladıqda yazışmalar burada görünəcək.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
