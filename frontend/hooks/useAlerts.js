'use client';

import useSWR from 'swr';
import api from '@/lib/api';

const fetcher = (url) => api.get(url).then((r) => r.data);

export function useAlerts(status = 'open') {
  const { data, error, isLoading, mutate } = useSWR(
    `/api/alerts?status=${status}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  return {
    alerts:    data?.alerts    || [],
    openCount: data?.openCount || 0,
    isLoading,
    error,
    mutate,
  };
}
