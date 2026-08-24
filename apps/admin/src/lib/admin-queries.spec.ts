import { describe, expect, it, vi } from 'vitest';
import type { QueryClient } from '@tanstack/react-query';
import { ADMIN_STATS_QUERY_KEY, refreshAdminQueries } from './admin-queries';

describe('refreshAdminQueries', () => {
  it('resursu və statistikani aktiv sorğular kimi yeniləyir', async () => {
    const invalidateQueries = vi.fn().mockResolvedValue(undefined);
    const queryClient = { invalidateQueries } as unknown as QueryClient;

    await refreshAdminQueries(queryClient, ['admin', 'providers']);

    expect(invalidateQueries).toHaveBeenCalledTimes(2);
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['admin', 'providers'],
      refetchType: 'active',
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: [...ADMIN_STATS_QUERY_KEY],
      refetchType: 'active',
    });
  });

  it('təkrar stats açarını birləşdirir', async () => {
    const invalidateQueries = vi.fn().mockResolvedValue(undefined);
    const queryClient = { invalidateQueries } as unknown as QueryClient;

    await refreshAdminQueries(queryClient, ['admin', 'stats'], ['admin', 'services']);

    expect(invalidateQueries).toHaveBeenCalledTimes(2);
  });
});
