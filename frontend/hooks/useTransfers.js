'use client';

import useSWR from 'swr';
import api from '@/lib/api';

const fetcher = (url) => api.get(url).then((r) => r.data);

export function useTransfers() {
  const { data, error, isLoading, mutate } = useSWR('/api/transfers', fetcher, {
    revalidateOnFocus: false,
  });

  return {
    transfers: data?.transfers || [],
    total:     data?.total     || 0,
    isLoading,
    error,
    mutate,
  };
}

export function useBeneficiaries() {
  const { data, error, isLoading, mutate } = useSWR('/api/transfers/beneficiaries', fetcher, {
    revalidateOnFocus: false,
  });

  return {
    beneficiaries: data?.beneficiaries || [],
    isLoading,
    error,
    mutate,
  };
}
