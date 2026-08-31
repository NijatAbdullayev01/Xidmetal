'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { UserRole } from '@xidmetal/shared';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { api, ApiError } from '@/lib/api';
import { useAuthToken } from '@/hooks/use-auth-token';

const AUDIENCE_OPTIONS = [
  { value: 'all', label: 'Bütün istifadəçilər' },
  { value: 'customers', label: 'Yalnız xidmət alanlar' },
  { value: 'providers', label: 'Yalnız xidmət verənlər' },
];

export function AdminAnnouncementsPage() {
  const token = useAuthToken();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState('all');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const send = useMutation({
    mutationFn: () => {
      const roles =
        audience === 'customers'
          ? [UserRole.CUSTOMER as const]
          : audience === 'providers'
            ? [UserRole.PROVIDER as const]
            : undefined;
      return api.admin.announce(token!, {
        title: title.trim(),
        body: body.trim(),
        roles,
      });
    },
    onSuccess: (result) => {
      setError(null);
      setSuccess(`${result.sentCount} istifadəçiyə bildiriş göndərildi`);
      setTitle('');
      setBody('');
      setAudience('all');
    },
    onError: (err: unknown) => {
      setSuccess(null);
      setError(err instanceof ApiError ? err.message : 'Göndərmə uğursuz oldu');
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Platforma bildirişləri</h1>
        <p className="mt-1 text-muted-foreground">
          Aktiv istifadəçilərin zəng bölməsinə `ADMIN_ANNOUNCEMENT` bildirişi göndərin.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Yeni bildiriş</CardTitle>
          <CardDescription>
            Mətn qısa və aydın olsun. Bildirişlər dərhal yaradılır.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ann-title">Başlıq</Label>
            <Input
              id="ann-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              placeholder="Məs: Planlı texniki iş"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ann-body">Mətn</Label>
            <Textarea
              id="ann-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              maxLength={2000}
              placeholder="İstifadəçilərə çatdırılacaq mesaj…"
            />
          </div>
          <div className="space-y-2">
            <Label>Auditoriya</Label>
            <Select
              value={audience}
              onChange={setAudience}
              options={AUDIENCE_OPTIONS}
              ariaLabel="Auditoriya"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          {success && (
            <p className="rounded-lg bg-success/10 px-3 py-2 text-sm text-success">{success}</p>
          )}

          <Button
            className="min-h-[44px]"
            disabled={send.isPending || title.trim().length < 3 || body.trim().length < 5}
            onClick={() => send.mutate()}
          >
            {send.isPending ? 'Göndərilir…' : 'Göndər'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
