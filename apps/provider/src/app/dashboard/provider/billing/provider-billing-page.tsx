'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CreditCard,
  Landmark,
  Loader2,
  Plus,
  Trash2,
  Copy,
  Check,
} from 'lucide-react';
import {
  COMMISSION,
  formatAzDateTime,
  type ProviderCardSummary,
  type WalletTransactionSummary,
} from '@xidmetal/shared';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api, ApiError } from '@/lib/api';
import { useAuthToken } from '@/hooks/use-auth-token';
import { cn } from '@/lib/utils';

const TX_TYPE_LABELS: Record<string, string> = {
  COMMISSION: 'Komissiya (15%)',
  CARD_DEPOSIT: 'Kart top-up',
  ADMIN_ADJUSTMENT: 'Köçürmə qeydi',
  REFUND: 'Geri qaytarma',
};

function formatAzm(amount: number): string {
  const formatted = new Intl.NumberFormat('az-AZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));
  return `${amount < 0 ? '-' : ''}${formatted} AZN`;
}

function formatCard(card: ProviderCardSummary): string {
  const brand = card.brand ? `${card.brand} ` : '';
  return `${brand}•••• ${card.last4}`;
}

export function ProviderBillingPage() {
  const token = useAuthToken();
  const queryClient = useQueryClient();

  const [banner, setBanner] = useState<'success' | 'error' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedCardId, setSelectedCardId] = useState('');
  const [amount, setAmount] = useState('');
  const [copied, setCopied] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const epoint = params.get('epoint');
    if (epoint === 'success' || epoint === 'error') {
      setBanner(epoint);
      params.delete('epoint');
      const next = params.toString();
      window.history.replaceState(
        {},
        '',
        `${window.location.pathname}${next ? `?${next}` : ''}`,
      );
    }
  }, []);

  const { data: account, isLoading: accountLoading } = useQuery({
    queryKey: ['commission', 'account'],
    queryFn: () => api.commission.account(token!),
    enabled: !!token,
  });

  const { data: cards, isLoading: cardsLoading } = useQuery({
    queryKey: ['commission', 'cards'],
    queryFn: () => api.commission.cards(token!),
    enabled: !!token,
  });

  const { data: tx, isLoading: txLoading } = useQuery({
    queryKey: ['commission', 'transactions', page],
    queryFn: () => api.commission.transactions(token!, { page: String(page), limit: '10' }),
    enabled: !!token,
  });

  const invalidateWallet = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['commission', 'account'] }),
      queryClient.invalidateQueries({ queryKey: ['commission', 'transactions'] }),
      queryClient.invalidateQueries({ queryKey: ['commission', 'cards'] }),
    ]);

  const registerCard = useMutation({
    mutationFn: () => api.commission.registerCard(token!),
    onSuccess: (res) => {
      if (res.redirectUrl) {
        window.location.assign(res.redirectUrl);
        return;
      }
      void queryClient.invalidateQueries({ queryKey: ['commission', 'cards'] });
    },
    onError: (err: unknown) =>
      setError(err instanceof ApiError ? err.message : 'Kart əlavə edilə bilmədi'),
  });

  const deleteCard = useMutation({
    mutationFn: (cardId: string) => api.commission.deleteCard(token!, cardId),
    onSuccess: () => {
      setSelectedCardId('');
      void queryClient.invalidateQueries({ queryKey: ['commission', 'cards'] });
    },
    onError: (err: unknown) =>
      setError(err instanceof ApiError ? err.message : 'Kart silinə bilmədi'),
  });

  const deposit = useMutation({
    mutationFn: (payload: { cardId: string; amount: number; idempotencyKey: string }) =>
      api.commission.deposit(
        token!,
        { cardId: payload.cardId, amount: payload.amount },
        { idempotencyKey: payload.idempotencyKey },
      ),
    onSuccess: async (res) => {
      if (res.redirectUrl) {
        window.location.assign(res.redirectUrl);
        return;
      }
      setAmount('');
      setError(null);
      await invalidateWallet();
    },
    onError: (err: unknown) =>
      setError(err instanceof ApiError ? err.message : 'Ödəniş başlatıla bilmədi'),
  });

  const handleDeposit = () => {
    setError(null);
    if (!selectedCardId) {
      setError('Əvvəlcə kart seçin');
      return;
    }
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed < COMMISSION.MIN_DEPOSIT_AZN) {
      setError(`Minimum ${COMMISSION.MIN_DEPOSIT_AZN} AZN daxil edin`);
      return;
    }
    deposit.mutate({
      cardId: selectedCardId,
      amount: parsed,
      idempotencyKey: crypto.randomUUID(),
    });
  };

  const copyAccountNumber = async () => {
    if (!account?.accountNumber) return;
    try {
      await navigator.clipboard.writeText(account.accountNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError('Hesab nömrəsi kopyalana bilmədi');
    }
  };

  const debt = account?.debt ?? 0;
  const suspended = account?.suspended ?? false;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Balans və borc</h1>
        <p className="mt-1 text-muted-foreground">
          Hər tamamlanmış sifarişdən 15% komissiya tutulur. Borc 10 AZN-ə çatdıqda 1 iş
          günü ərzində ödənilməlidir; əks halda hesabınız müvəqqəti bağlanır və yeni sifariş
          qəbul edə bilməzsiniz. Hesabınızın fasiləsiz işləməsi üçün borcun 10 AZN-ə
          çatmasına yol verməməniz tövsiyə olunur.
        </p>
      </div>

      {banner === 'success' && (
        <p className="rounded-lg bg-success/10 px-4 py-3 text-sm text-success">
          Ödəniş uğurla tamamlandı.
        </p>
      )}
      {banner === 'error' && (
        <p className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Ödəniş tamamlanmadı. Zəhmət olmasa yenidən cəhd edin.
        </p>
      )}
      {error && (
        <p className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {suspended && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Hesabınız ödənilməmiş borc səbəbindən bağlanıb. Borcu ödədikdən sonra avtomatik
          açılacaq.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Hesab nömrəsi</CardTitle>
            <CardDescription>
              Köçürmə ilə ödəyərkən bu nömrəni təyinatda qeyd edin.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {accountLoading && !account ? (
              <p className="text-sm text-muted-foreground">Yüklənir…</p>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-lg font-semibold tracking-wide">
                  {account?.accountNumber ?? '—'}
                </span>
                <Button variant="outline" size="sm" onClick={copyAccountNumber}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? 'Kopyalandı' : 'Kopyala'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cari borc</CardTitle>
            <CardDescription>
              {account?.debtDueAt
                ? `Ödəmə son tarixi: ${formatAzDateTime(account.debtDueAt)}`
                : 'Hazırda müddət tətbiq olunmayıb'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  'text-2xl font-bold tabular-nums',
                  debt > 0 ? 'text-destructive' : 'text-success',
                )}
              >
                {debt > 0 ? `-${formatAzm(debt)}` : '0.00 AZN'}
              </span>
              {suspended ? (
                <Badge variant="destructive">Bağlıdır</Badge>
              ) : debt > 0 ? (
                <Badge variant="warning">Borc var</Badge>
              ) : (
                <Badge variant="success">Təmiz</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Kart ilə top-up</CardTitle>
          <CardDescription>
            Saxlanmış kartınızla balansı artırıb borcu sıfırlaya bilərsiniz.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="card-select">Kart</Label>
              <div className="flex flex-wrap gap-2">
                {cardsLoading && <p className="text-sm text-muted-foreground">Yüklənir…</p>}
                {!cardsLoading && (cards?.length ?? 0) === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Hələ kart əlavə olunmayıb.
                  </p>
                )}
                {cards?.map((card) => (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => setSelectedCardId(card.id)}
                    className={cn(
                      'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors',
                      selectedCardId === card.id
                        ? 'border-brand bg-brand/10 text-brand-foreground'
                        : 'border-border hover:bg-muted',
                    )}
                  >
                    <CreditCard className="h-4 w-4" />
                    {formatCard(card)}
                    {card.isDefault && <Badge variant="muted">Əsas</Badge>}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="amount">Məbləğ (AZN)</Label>
              <Input
                id="amount"
                type="number"
                inputMode="decimal"
                min={COMMISSION.MIN_DEPOSIT_AZN}
                step="0.01"
                placeholder="50"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={handleDeposit}
              disabled={deposit.isPending || cardsLoading}
              className="min-h-[44px]"
            >
              {deposit.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Landmark className="h-4 w-4" />
              )}
              Ödə
            </Button>
            <Button
              variant="outline"
              className="min-h-[44px]"
              disabled={registerCard.isPending}
              onClick={() => registerCard.mutate()}
            >
              {registerCard.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Yeni kart əlavə et
            </Button>
          </div>

          {cards?.map((card) => (
            <div
              key={card.id}
              className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
            >
              <span className="text-sm text-muted-foreground">{formatCard(card)}</span>
              <Button
                variant="ghost"
                size="sm"
                aria-label="Kartı sil"
                onClick={() => deleteCard.mutate(card.id)}
                disabled={deleteCard.isPending}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Əməliyyatlar</CardTitle>
          <CardDescription>Hesabınızdakı bütün hərəkətlər</CardDescription>
        </CardHeader>
        <CardContent>
          {txLoading && !tx ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Yüklənir…</p>
          ) : (tx?.items.length ?? 0) === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Əməliyyat yoxdur</p>
          ) : (
            <ul className="divide-y divide-border">
              {tx?.items.map((row: WalletTransactionSummary) => (
                <li key={row.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {TX_TYPE_LABELS[row.type] ?? row.type}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatAzDateTime(row.createdAt)}
                      {row.description ? ` · ${row.description}` : ''}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'text-sm font-semibold tabular-nums',
                      row.amount > 0 ? 'text-success' : 'text-destructive',
                    )}
                  >
                    {row.amount > 0 ? '+' : ''}
                    {formatAzm(row.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {tx && tx.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between gap-3">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Əvvəlki
              </Button>
              <span className="text-sm text-muted-foreground">
                {page} / {tx.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= tx.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Növbəti
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
