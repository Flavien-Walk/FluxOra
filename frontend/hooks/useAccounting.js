'use client';

import useSWR from 'swr';
import api from '@/lib/api';

const fetcher = (url) => api.get(url).then((r) => r.data);

export function useAccounting(filters = {}) {
  const params = new URLSearchParams(filters).toString();
  const key = `/api/accounting${params ? `?${params}` : ''}`;

  const { data, error, isLoading, mutate } = useSWR(key, fetcher, {
    revalidateOnFocus: false,
  });

  return {
    entries: data?.entries || [],
    total: data?.total || 0,
    summary: data?.summary || { totalCredits: 0, totalDebits: 0 },
    isLoading,
    error,
    mutate,
  };
}
