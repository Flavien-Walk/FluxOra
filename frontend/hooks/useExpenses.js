'use client';

import useSWR from 'swr';
import api from '@/lib/api';

const fetcher = (url) => api.get(url).then((r) => r.data);

export function useExpenses(category = '') {
  const params = category ? `?category=${category}` : '';
  const { data, error, isLoading, mutate } = useSWR(
    `/api/expenses${params}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  return {
    expenses: data?.expenses || [],
    total: data?.total || 0,
    isLoading,
    error,
    mutate,
  };
}
