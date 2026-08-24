import type { QueryClient, QueryKey } from '@tanstack/react-query';

export const ADMIN_STATS_QUERY_KEY = ['admin', 'stats'] as const;

/** Moderasiya siyahıları — növbə səhifə yeniləmədən görünsün */
export const ADMIN_LIST_POLL_MS = 10_000;

export const adminListQueryOptions = {
  staleTime: 0,
  refetchInterval: ADMIN_LIST_POLL_MS,
  refetchOnWindowFocus: true,
} as const;

function uniqueQueryKeys(keys: QueryKey[]): QueryKey[] {
  const seen = new Set<string>();
  const unique: QueryKey[] = [];
  for (const key of keys) {
    const id = JSON.stringify(key);
    if (seen.has(id)) continue;
    seen.add(id);
    unique.push(key);
  }
  return unique;
}

/**
 * Aktiv sorğuları dərhal yeniləyir (siyahı + sidebar statistikası).
 * `staleTime` olsa belə invalidate refetch edir.
 */
export async function refreshAdminQueries(
  queryClient: QueryClient,
  ...queryKeys: QueryKey[]
): Promise<void> {
  const keys = uniqueQueryKeys([...queryKeys, [...ADMIN_STATS_QUERY_KEY]]);
  await Promise.all(
    keys.map((queryKey) =>
      queryClient.invalidateQueries({
        queryKey,
        refetchType: 'active',
      }),
    ),
  );
}
