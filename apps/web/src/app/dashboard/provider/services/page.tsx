'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PlusCircle, Loader2, Pencil, Trash2 } from 'lucide-react';
import { ServiceStatus } from '@xidmetal/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Button, buttonStyles } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api, ApiError } from '@/lib/api';
import { useAuthToken } from '@/hooks/use-auth-token';
import { formatPrice, formatDate } from '@/lib/utils';
import {
  SERVICE_STATUS_LABELS,
  SERVICE_STATUS_VARIANTS,
  getPriceUnitLabel,
} from '@/lib/provider-labels';
import { useState } from 'react';

export default function MyServicesPage() {
  const token = useAuthToken();
  const queryClient = useQueryClient();
  const [actionId, setActionId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['services', 'mine'],
    queryFn: () => api.myServices(token!, { limit: '50' }),
    enabled: !!token,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ServiceStatus }) => {
      if (!token) throw new ApiError('Autentifikasiya tələb olunur', 401);
      return api.updateService(token, id, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services', 'mine'] });
      setActionId(null);
      setActionError(null);
    },
    onError: (error) => {
      setActionId(null);
      if (error instanceof ApiError) {
        setActionError(error.message);
      } else {
        setActionError('Status yenilənərkən xəta baş verdi');
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => {
      if (!token) throw new ApiError('Autentifikasiya tələb olunur', 401);
      return api.deleteService(token, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services', 'mine'] });
      setActionId(null);
      setActionError(null);
    },
    onError: (error) => {
      setActionId(null);
      if (error instanceof ApiError) {
        setActionError(error.message);
      } else if (error instanceof Error) {
        setActionError(error.message);
      } else {
        setActionError('Xidmət silinərkən xəta baş verdi');
      }
    },
  });

  const handleStatusChange = (id: string, status: ServiceStatus) => {
    setActionError(null);
    setActionId(id);
    updateMutation.mutate({ id, status });
  };

  const handleDelete = (id: string, title: string, hasBookingHistory: boolean) => {
    const message = hasBookingHistory
      ? `"${title}" xidmətini silmək istədiyinizə əminsiniz? Sifariş tarixçəsi saxlanılacaq və xidmət arxivlənəcək.`
      : `"${title}" xidmətini silmək istədiyinizə əminsiniz? Bu əməliyyat geri qaytarıla bilməz.`;

    const confirmed = window.confirm(message);
    if (!confirmed) return;

    setActionError(null);
    setActionId(id);
    deleteMutation.mutate(id);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Xidmətlərim</h1>
          <p className="mt-1 text-muted-foreground">
            Bütün xidmətlərinizi idarə edin və statuslarını dəyişin.
          </p>
        </div>
        <Link href="/dashboard/provider/services/new" className={buttonStyles()}>
          <PlusCircle className="h-4 w-4" />
          Yeni xidmət
        </Link>
      </div>

      {actionError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {actionError}
        </div>
      )}

      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-brand" />
        </div>
      )}

      {!isLoading && data?.items.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center py-16 text-center">
            <p className="text-muted-foreground">Hələ heç bir xidmət yaratmamısınız.</p>
            <Link href="/dashboard/provider/services/new" className={buttonStyles() + ' mt-4'}>
              İlk xidməti yarat
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {data?.items.map((service) => {
          const hasBookingHistory = (service.bookingCount ?? 0) > 0;
          const hasActiveBookings = (service.activeBookingCount ?? 0) > 0;

          return (
          <Card key={service.id}>
            <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold">{service.title}</h3>
                  <Badge variant={SERVICE_STATUS_VARIANTS[service.status]}>
                    {SERVICE_STATUS_LABELS[service.status]}
                  </Badge>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {service.description}
                </p>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span>{service.categoryName}</span>
                  <span>
                    {formatPrice(service.price)} / {getPriceUnitLabel(service.priceUnit)}
                  </span>
                  <span>{formatDate(service.createdAt)}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/dashboard/provider/services/${service.id}/edit`}
                  className={buttonStyles('outline', 'sm')}
                  aria-label={`${service.title} xidmətini düzəliş et`}
                >
                  <Pencil className="h-4 w-4" />
                  Düzəliş et
                </Link>
                {service.status === ServiceStatus.DRAFT && (
                  <Button
                    size="sm"
                    disabled={actionId === service.id}
                    onClick={() => handleStatusChange(service.id, ServiceStatus.ACTIVE)}
                  >
                    {actionId === service.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Aktiv et'
                    )}
                  </Button>
                )}
                {service.status === ServiceStatus.ACTIVE && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={actionId === service.id}
                    onClick={() => handleStatusChange(service.id, ServiceStatus.PAUSED)}
                  >
                    Dayandır
                  </Button>
                )}
                {service.status === ServiceStatus.PAUSED && (
                  <Button
                    size="sm"
                    disabled={actionId === service.id}
                    onClick={() => handleStatusChange(service.id, ServiceStatus.ACTIVE)}
                  >
                    Aktiv et
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={actionId === service.id || hasActiveBookings}
                  title={
                    hasActiveBookings
                      ? 'Aktiv sifarişləri olan xidmət silinə bilməz.'
                      : undefined
                  }
                  aria-label={`${service.title} xidmətini sil`}
                  onClick={() => handleDelete(service.id, service.title, hasBookingHistory)}
                >
                  {actionId === service.id && deleteMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  Sil
                </Button>
              </div>
            </CardContent>
          </Card>
          );
        })}
      </div>
    </div>
  );
}
