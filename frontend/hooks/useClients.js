'use client';

import useSWR from 'swr';
import api from '@/lib/api';

const fetcher = (url) => api.get(url).then((r) => r.data);

export function useClients(search = '') {
  const params = search ? `?search=${encodeURIComponent(search)}` : '';
  const { data, error, isLoading, mutate } = useSWR(
    `/api/clients${params}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  return {
    clients: data?.clients || [],
    total: data?.total || 0,
    isLoading,
    error,
    mutate,
  };
}

export function useClient(id) {
  const { data, error, isLoading, mutate } = useSWR(
    id ? `/api/clients/${id}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  return { client: data, isLoading, error, mutate };
}
