'use client';

import useSWR from 'swr';
import api from '@/lib/api';

const fetcher = (url) => api.get(url).then((r) => r.data);

export function useInvoices(status = '') {
  const params = status ? `?status=${status}` : '';
  const { data, error, isLoading, mutate } = useSWR(
    `/api/invoices${params}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  return {
    invoices: data?.invoices || [],
    total: data?.total || 0,
    isLoading,
    error,
    mutate,
  };
}

export function useInvoice(id) {
  const { data, error, isLoading, mutate } = useSWR(
    id ? `/api/invoices/${id}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  return { invoice: data, isLoading, error, mutate };
}
