'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ProviderAccountType,
  SERVICE_TEAMS,
  createServiceTeamSchema,
} from '@xidmetal/shared';
import { ArrowLeft, Loader2, Plus, Trash2, Users } from 'lucide-react';
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonStyles } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { api, ApiError } from '@/lib/api';
import { useAuthToken } from '@/hooks/use-auth-token';
import { useAuthStore } from '@/store/auth.store';

interface ServiceTeamsPageProps {
  serviceId: string;
}

export function ServiceTeamsPage({ serviceId }: ServiceTeamsPageProps) {
  const token = useAuthToken();
  const queryClient = useQueryClient();
  const accountType = useAuthStore((state) => state.user?.providerProfile?.accountType);
  const isCompany = accountType === ProviderAccountType.COMPANY;
  const [newName, setNewName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: service, isLoading: serviceLoading } = useQuery({
    queryKey: ['services', serviceId],
    queryFn: () => api.service(serviceId, token ?? undefined),
    enabled: !!token,
  });

  const { data: teams = [], isLoading: teamsLoading } = useQuery({
    queryKey: ['services', serviceId, 'teams'],
    queryFn: () => api.listServiceTeams(token!, serviceId),
    enabled: !!token,
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => {
      if (!token) throw new ApiError('Autentifikasiya tələb olunur', 401);
      return api.createServiceTeam(token, serviceId, { name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services', serviceId, 'teams'] });
      queryClient.invalidateQueries({ queryKey: ['services', 'mine'] });
      setNewName('');
      setFormError(null);
      setActionError(null);
    },
    onError: (error) => {
      setActionError(error instanceof ApiError ? error.message : 'Komanda yaradıla bilmədi');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (teamId: string) => {
      if (!token) throw new ApiError('Autentifikasiya tələb olunur', 401);
      return api.deleteServiceTeam(token, serviceId, teamId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services', serviceId, 'teams'] });
      queryClient.invalidateQueries({ queryKey: ['services', 'mine'] });
      setDeleteId(null);
      setActionError(null);
    },
    onError: (error) => {
      setDeleteId(null);
      setActionError(error instanceof ApiError ? error.message : 'Komanda silinə bilmədi');
    },
  });

  const handleCreate = () => {
    const parsed = createServiceTeamSchema.safeParse({ name: newName });
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? 'Komanda adını daxil edin');
      return;
    }
    createMutation.mutate(parsed.data.name);
  };

  const isLoading = serviceLoading || teamsLoading;
  const activeCount = teams.filter((team) => team.isActive).length;
  const deleteTarget = teams.find((team) => team.id === deleteId) ?? null;

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  if (!service) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
          <p className="text-muted-foreground">Xidmət tapılmadı və ya yüklənmədi.</p>
          <Link href="/dashboard/provider/services" className={buttonStyles('outline')}>
            <ArrowLeft className="h-4 w-4" />
            Xidmətlərə qayıt
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="min-w-0">
        <Link
          href="/dashboard/provider/services"
          className="inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Xidmətlərə qayıt
        </Link>
        <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Users className="h-6 w-6 shrink-0 text-brand" />
          Komandalar
        </h1>
        <p className="mt-1 text-muted-foreground">
          «{service.title}» xidməti üçün paralel iş tutumu. Hər komanda eyni vaxtda bir sifariş
          götürə bilər.
        </p>
      </div>

      {actionError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {actionError}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Aktiv tutum</CardTitle>
          <CardDescription>
            {activeCount} aktiv komanda — eyni vaxtda {activeCount} sifariş qəbul edilə bilər.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {teams.length === 0 ? (
            <p className="text-sm text-muted-foreground">Hələ komanda yoxdur.</p>
          ) : (
            <ul className="divide-y divide-border rounded-lg border">
              {teams.map((team) => (
                <li
                  key={team.id}
                  className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{team.name}</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {team.isDefault ? <Badge variant="muted">Əsas</Badge> : null}
                      {!team.isActive ? <Badge variant="warning">Deaktiv</Badge> : null}
                    </div>
                  </div>
                  {isCompany && !team.isDefault ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0 self-start sm:self-auto"
                      onClick={() => setDeleteId(team.id)}
                      aria-label={`${team.name} komandasını sil`}
                    >
                      <Trash2 className="h-4 w-4" />
                      Sil
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {isCompany ? (
        <Card>
          <CardHeader>
            <CardTitle>Yeni komanda</CardTitle>
            <CardDescription>
              Məsələn, xalça yumada 3 ekipajınız varsa, 3 komanda yaradın. Maksimum{' '}
              {SERVICE_TEAMS.MAX_PER_SERVICE} komanda.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1 space-y-1.5">
                <Label htmlFor="teamName">Komanda adı</Label>
                <Input
                  id="teamName"
                  value={newName}
                  onChange={(event) => {
                    setNewName(event.target.value);
                    setFormError(null);
                  }}
                  placeholder="Məs. Xalça yuma — komanda 2"
                  error={!!formError}
                  maxLength={SERVICE_TEAMS.NAME_MAX_LENGTH}
                />
                {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
              </div>
              <Button
                className="shrink-0"
                disabled={createMutation.isPending || activeCount >= SERVICE_TEAMS.MAX_PER_SERVICE}
                onClick={handleCreate}
              >
                {createMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Əlavə et
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <p className="text-sm text-muted-foreground">
          Əlavə komanda yalnız şirkət hesabında yaradıla bilər. Fərdi hesabda tutum 1 nəfərdir.
        </p>
      )}

      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteId(null)}
        title="Komandanı sil"
        description="Aktiv sifarişi olan komandanı silmək olmaz."
        panelClassName="max-w-md"
      >
        <div className="space-y-4 p-4 sm:p-6">
          <p className="text-sm text-muted-foreground">
            «{deleteTarget?.name}» silinsin? Aktiv sifarişi olan komandanı silmək olmaz.
          </p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" className="min-h-11" onClick={() => setDeleteId(null)}>
              Ləğv et
            </Button>
            <Button
              variant="destructive"
              className="min-h-11"
              disabled={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sil'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
