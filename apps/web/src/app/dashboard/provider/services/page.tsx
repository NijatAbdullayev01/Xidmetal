'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Loader2, Pencil, PlusCircle, Trash2, X } from 'lucide-react';
import { ServiceStatus } from '@xidmetal/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Button, buttonStyles } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { api, ApiError } from '@/lib/api';
import { useAuthToken } from '@/hooks/use-auth-token';
import { formatPrice, formatDate } from '@/lib/utils';
import {
  SERVICE_STATUS_LABELS,
  SERVICE_STATUS_VARIANTS,
  getPriceUnitLabel,
} from '@/lib/provider-labels';
import { useState } from 'react';
import { ProviderVerificationBanner } from '@/components/provider/provider-verification-banner';

interface DeleteTarget {
  id: string;
  title: string;
  hasBookingHistory: boolean;
}

export default function MyServicesPage() {
  const token = useAuthToken();
  const queryClient = useQueryClient();
  const [actionId, setActionId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  const { data: me } = useQuery({
    queryKey: ['users', 'me'],
    queryFn: () => api.users.me(token!),
    enabled: !!token,
  });
  const isVerified = me?.providerProfile?.isVerified === true;

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

  const submitReviewMutation = useMutation({
    mutationFn: (id: string) => {
      if (!token) throw new ApiError('Autentifikasiya tələb olunur', 401);
      return api.submitServiceForReview(token, id);
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
        setActionError('Yoxlamaya göndərilərkən xəta baş verdi');
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
      setDeleteTarget(null);
      setActionError(null);
    },
    onError: (error) => {
      setActionId(null);
      setDeleteTarget(null);
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

  const handleSubmitForReview = (id: string) => {
    setActionError(null);
    setActionId(id);
    submitReviewMutation.mutate(id);
  };

  const openDeleteDialog = (id: string, title: string, hasBookingHistory: boolean) => {
    setActionError(null);
    setDeleteTarget({ id, title, hasBookingHistory });
  };

  const closeDeleteDialog = () => {
    if (deleteMutation.isPending) return;
    setDeleteTarget(null);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    setActionError(null);
    setActionId(deleteTarget.id);
    deleteMutation.mutate(deleteTarget.id);
  };

  return (
    <div className="space-y-6">
      <ProviderVerificationBanner />
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
                {service.status === ServiceStatus.NEEDS_REVISION && service.reviewNote ? (
                  <p
                    className="mt-2 rounded-lg border border-amber-300/70 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-700/50 dark:bg-amber-950/30 dark:text-amber-100"
                    role="status"
                  >
                    Admin qeydi: {service.reviewNote}
                  </p>
                ) : null}
                {service.status === ServiceStatus.PENDING_REVIEW ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Admin yoxlamasındadır — təsdiqdən sonra müştərilərə görünəcək.
                  </p>
                ) : null}
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span>Kateqoriya: {service.categoryName}</span>
                  <span>
                    Qiymət:{' '}
                    {service.price > 0
                      ? `${formatPrice(service.price)} / ${getPriceUnitLabel(service.priceUnit)}`
                      : formatPrice(service.price)}
                  </span>
                  <span>Yaradılıb: {formatDate(service.createdAt)}</span>
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
                {(service.status === ServiceStatus.DRAFT ||
                  service.status === ServiceStatus.NEEDS_REVISION) && (
                  <Button
                    size="sm"
                    disabled={actionId === service.id || !isVerified}
                    title={
                      !isVerified
                        ? 'Yoxlamaya göndərmək üçün hesab təsdiqi lazımdır'
                        : undefined
                    }
                    onClick={() => handleSubmitForReview(service.id)}
                  >
                    {actionId === service.id && submitReviewMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Yoxlamaya göndər'
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
                    disabled={actionId === service.id || !isVerified}
                    title={
                      !isVerified
                        ? 'Aktivləşdirmək üçün hesab təsdiqi lazımdır'
                        : undefined
                    }
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
                  onClick={() => openDeleteDialog(service.id, service.title, hasBookingHistory)}
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

      <Modal
        open={!!deleteTarget}
        onClose={closeDeleteDialog}
        title="Xidməti sil"
        description={
          deleteTarget
            ? deleteTarget.hasBookingHistory
              ? `"${deleteTarget.title}" xidmətini silmək istədiyinizə əminsiniz? Sifariş tarixçəsi saxlanılacaq və xidmət arxivlənəcək.`
              : `"${deleteTarget.title}" xidmətini silmək istədiyinizə əminsiniz? Bu əməliyyat geri qaytarıla bilməz.`
            : undefined
        }
        panelClassName="max-w-md"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertTriangle className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold">Xidməti sil</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">Bu əməliyyatı təsdiqləyin</p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeDeleteDialog}
            disabled={deleteMutation.isPending}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
            aria-label="Bağla"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5 sm:px-6">
          {deleteTarget && (
            <>
              <p className="text-sm leading-relaxed text-foreground sm:text-base">
                <span className="font-semibold">&ldquo;{deleteTarget.title}&rdquo;</span>{' '}
                xidmətini silmək istədiyinizə əminsiniz?
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {deleteTarget.hasBookingHistory
                  ? 'Sifariş tarixçəsi saxlanılacaq və xidmət arxivlənəcək.'
                  : 'Bu əməliyyat geri qaytarıla bilməz.'}
              </p>
            </>
          )}

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="min-h-11 w-full sm:min-h-10 sm:w-auto"
              disabled={deleteMutation.isPending}
              onClick={closeDeleteDialog}
            >
              Ləğv et
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="min-h-11 w-full sm:min-h-10 sm:w-auto"
              disabled={deleteMutation.isPending}
              onClick={confirmDelete}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Bəli, sil
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
