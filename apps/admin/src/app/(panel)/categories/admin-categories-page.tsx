'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { api, ApiError } from '@/lib/api';
import { useAuthToken } from '@/hooks/use-auth-token';
import { getCategoryIcon } from '@/lib/category-icons';
import type { AdminCategorySummary } from '@xidmetal/shared';

export function AdminCategoriesPage() {
  const token = useAuthToken();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<AdminCategorySummary | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: '',
    slug: '',
    icon: '',
    description: '',
    sortOrder: '0',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: () => api.admin.categories(token!),
    enabled: !!token,
  });

  const resetForm = () => {
    setForm({ name: '', slug: '', icon: '', description: '', sortOrder: '0' });
    setEditing(null);
    setCreating(false);
  };

  const startEdit = (cat: AdminCategorySummary) => {
    setCreating(false);
    setEditing(cat);
    setForm({
      name: cat.name,
      slug: cat.slug,
      icon: cat.icon ?? '',
      description: cat.description ?? '',
      sortOrder: String(cat.sortOrder),
    });
  };

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim() || undefined,
        icon: form.icon.trim() || undefined,
        description: form.description.trim() || undefined,
        sortOrder: Number(form.sortOrder) || 0,
      };
      if (editing) {
        return api.admin.updateCategory(token!, editing.id, payload);
      }
      return api.admin.createCategory(token!, payload);
    },
    onSuccess: async () => {
      setError(null);
      resetForm();
      await queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
    onError: (err: unknown) => {
      setError(err instanceof ApiError ? err.message : 'Saxlama uğursuz oldu');
    },
  });

  const toggleActive = useMutation({
    mutationFn: (cat: AdminCategorySummary) =>
      api.admin.updateCategory(token!, cat.id, { isActive: !cat.isActive }),
    onSuccess: async () => {
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
    onError: (err: unknown) => {
      setError(err instanceof ApiError ? err.message : 'Əməliyyat uğursuz oldu');
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Kateqoriyalar</h1>
          <p className="mt-1 text-muted-foreground">
            Marketplace kateqoriyalarını yaradın, redaktə edin və aktivləşdirin.
          </p>
        </div>
        <Button
          className="min-h-[44px]"
          onClick={() => {
            setEditing(null);
            setCreating(true);
            setForm({ name: '', slug: '', icon: '', description: '', sortOrder: '0' });
          }}
        >
          Yeni kateqoriya
        </Button>
      </div>

      {(creating || editing) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {editing ? 'Kateqoriyanı redaktə et' : 'Yeni kateqoriya'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cat-name">Ad</Label>
                <Input
                  id="cat-name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cat-slug">Slug (opsional)</Label>
                <Input
                  id="cat-slug"
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                  placeholder="avtomatik yaradılacaq"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cat-icon">İkon</Label>
                <Input
                  id="cat-icon"
                  value={form.icon}
                  onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
                  placeholder="🧹"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cat-sort">Sıra</Label>
                <Input
                  id="cat-sort"
                  type="number"
                  min={0}
                  value={form.sortOrder}
                  onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat-desc">Təsvir</Label>
              <Textarea
                id="cat-desc"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
              />
            </div>
            {error && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                className="min-h-[44px]"
                disabled={save.isPending || !form.name.trim()}
                onClick={() => save.mutate()}
              >
                Saxla
              </Button>
              <Button variant="outline" className="min-h-[44px]" onClick={resetForm}>
                Ləğv et
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          {isLoading && (
            <p className="py-8 text-center text-sm text-muted-foreground">Yüklənir…</p>
          )}
          <ul className="divide-y divide-border">
            {data?.map((cat) => {
              const Icon = getCategoryIcon(cat.slug);

              return (
                <li
                  key={cat.id}
                  className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand/35 to-brand/15 ring-1 ring-brand/25"
                        aria-hidden
                      >
                        <Icon
                          className="h-5 w-5 text-foreground"
                          strokeWidth={1.75}
                        />
                      </div>
                      <p className="font-medium">{cat.name}</p>
                      <Badge variant={cat.isActive ? 'success' : 'muted'}>
                        {cat.isActive ? 'Aktiv' : 'Deaktiv'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      /{cat.slug} · {cat.serviceCount} xidmət · sıra {cat.sortOrder}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="min-h-[44px]"
                      onClick={() => startEdit(cat)}
                    >
                      Redaktə
                    </Button>
                    <Button
                      variant={cat.isActive ? 'outline' : 'default'}
                      size="sm"
                      className="min-h-[44px]"
                      disabled={toggleActive.isPending}
                      onClick={() => toggleActive.mutate(cat)}
                    >
                      {cat.isActive ? 'Deaktiv et' : 'Aktiv et'}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
