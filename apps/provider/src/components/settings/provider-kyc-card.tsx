'use client';

import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  KycDocumentStatus,
  KycDocumentType,
  KYC_DOCUMENT_STATUS_LABELS,
  KYC_DOCUMENT_TYPE_LABELS,
  type KycDocumentSummary,
  toDisplayMediaUrl,
} from '@xidmetal/shared';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { api, ApiError, uploadImage } from '@/lib/api';
import { useAuthToken } from '@/hooks/use-auth-token';

const MAX_KYC_BYTES = 1 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

const DOC_TYPES = [
  KycDocumentType.ID_FRONT,
  KycDocumentType.ID_BACK,
  KycDocumentType.SELFIE,
] as const;

function statusBadge(status: string): 'warning' | 'success' | 'destructive' | 'muted' {
  if (status === KycDocumentStatus.APPROVED) return 'success';
  if (status === KycDocumentStatus.REJECTED) return 'destructive';
  if (status === KycDocumentStatus.PENDING) return 'warning';
  return 'muted';
}

function latestByType(docs: KycDocumentSummary[] | undefined, type: KycDocumentType) {
  return docs?.find((doc) => doc.type === type);
}

export function ProviderKycCard() {
  const token = useAuthToken();
  const queryClient = useQueryClient();
  const fileInputRefs = useRef<Partial<Record<KycDocumentType, HTMLInputElement | null>>>({});
  const [error, setError] = useState<string | null>(null);
  const [uploadingType, setUploadingType] = useState<KycDocumentType | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['users', 'me', 'kyc'],
    queryFn: () => api.users.kyc(token!),
    enabled: !!token,
  });

  const submit = useMutation({
    mutationFn: async ({ type, file }: { type: KycDocumentType; file: File }) => {
      const url = await uploadImage(token!, file, 'kyc');
      return api.users.submitKyc(token!, { type, url });
    },
    onSuccess: async () => {
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ['users', 'me', 'kyc'] });
    },
    onError: (err: unknown) => {
      setError(err instanceof ApiError ? err.message : 'Sənəd yüklənmədi');
    },
    onSettled: () => setUploadingType(null),
  });

  const handleSelect = (type: KycDocumentType, file: File | undefined) => {
    if (!file || !token) return;
    if (!ACCEPTED_TYPES.includes(file.type as (typeof ACCEPTED_TYPES)[number])) {
      setError('Yalnız JPG, PNG və ya WEBP formatı qəbul edilir');
      return;
    }
    if (file.size > MAX_KYC_BYTES) {
      setError('Şəkil maksimum 1 MB ola bilər');
      return;
    }
    setError(null);
    setUploadingType(type);
    submit.mutate({ type, file });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Şəxsiyyət təsdiqi</CardTitle>
        <CardDescription>
          Şəxsiyyət vəsiqəsinin ön/arxa tərəfi və selfie yükləyin. Admin yoxladıqdan sonra
          hesabınız təsdiqlənə bilər.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
        )}
        {isLoading && <p className="text-sm text-muted-foreground">Yüklənir…</p>}
        <ul className="space-y-4">
          {DOC_TYPES.map((type) => {
            const latest = latestByType(data, type);
            const busy = uploadingType === type;
            return (
              <li
                key={type}
                className="flex flex-col gap-3 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 space-y-1">
                  <Label>{KYC_DOCUMENT_TYPE_LABELS[type]}</Label>
                  {latest ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={statusBadge(latest.status)}>
                        {KYC_DOCUMENT_STATUS_LABELS[latest.status as KycDocumentStatus] ??
                          latest.status}
                      </Badge>
                      {latest.adminNote && (
                        <p className="text-xs text-muted-foreground">{latest.adminNote}</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Hələ yüklənməyib</p>
                  )}
                  {latest?.url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={toDisplayMediaUrl(latest.url)}
                      alt={KYC_DOCUMENT_TYPE_LABELS[type]}
                      className="mt-2 h-20 w-auto rounded-md border border-border object-cover"
                    />
                  )}
                </div>
                <div>
                  <input
                    ref={(el) => {
                      fileInputRefs.current[type] = el;
                    }}
                    type="file"
                    accept={ACCEPTED_TYPES.join(',')}
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = '';
                      handleSelect(type, file);
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-[44px]"
                    disabled={busy || submit.isPending}
                    onClick={() => fileInputRefs.current[type]?.click()}
                  >
                    {busy ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Yüklənir...
                      </>
                    ) : latest ? (
                      'Yenidən yüklə'
                    ) : (
                      'Şəkil yüklə'
                    )}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
