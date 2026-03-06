'use client';

import useSWR from 'swr';
import api from '@/lib/api';

const fetcher = (url) => api.get(url).then((r) => r.data);

export function useQuotes(status = '') {
  const params = status ? `?status=${status}` : '';
  const { data, error, isLoading, mutate } = useSWR(
    `/api/quotes${params}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  return {
    quotes: data?.quotes || [],
    total: data?.total || 0,
    isLoading,
    error,
    mutate,
  };
}

export function useQuote(id) {
  const { data, error, isLoading, mutate } = useSWR(
    id ? `/api/quotes/${id}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );
  return { quote: data, isLoading, error, mutate };
}
