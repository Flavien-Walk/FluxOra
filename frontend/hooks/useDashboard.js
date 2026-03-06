'use client';

import useSWR from 'swr';
import api from '@/lib/api';

const fetcher = (url) => api.get(url).then((r) => r.data);

export function useDashboard() {
  const { data, error, isLoading, mutate } = useSWR(
    '/api/dashboard/summary',
    fetcher,
    { revalidateOnFocus: false, refreshInterval: 60000 }
  );

  return {
    summary: data || null,
    isLoading,
    error,
    mutate,
  };
}
