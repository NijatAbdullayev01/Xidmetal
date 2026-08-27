'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthToken } from '@/hooks/use-auth-token';
import { PROVIDER_VERIFICATION_POLL_MS } from '@/lib/live-attention';
import { useServiceNotifications } from '@/hooks/use-service-notifications';
import { providerServicesNavAttention } from '@/lib/nav-attention';

export const PROVIDER_DASHBOARD_STATS_QUERY_KEY = ['users', 'dashboard-stats'] as const;

/** Xidmət verən — düzəliş növbəsi + oxunmamış təsdiq (Xidmətlərim işığı). */
export function useProviderServiceAttention(enabled = true) {
  const token = useAuthToken();

  const { data } = useQuery({
    queryKey: PROVIDER_DASHBOARD_STATS_QUERY_KEY,
    queryFn: () => api.users.dashboardStats(token!),
    enabled: enabled && !!token,
    refetchInterval: PROVIDER_VERIFICATION_POLL_MS,
    refetchOnWindowFocus: true,
    staleTime: 5_000,
  });

  const { approvedCount } = useServiceNotifications(enabled);
  const needsRevisionCount = data?.servicesNeedingRevision ?? 0;

  return {
    needsRevisionCount,
    unreadApprovedCount: approvedCount,
    attentionCount: providerServicesNavAttention({
      needsRevisionCount,
      unreadApprovedCount: approvedCount,
    }),
  };
}
