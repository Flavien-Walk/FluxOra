'use client';

import useSWR from 'swr';
import api from '@/lib/api';

const fetcher = () => api.get('/api/organizations/me').then((r) => r.data);

export function useOrganization() {
  const { data, error, isLoading, mutate } = useSWR('organization', fetcher, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });

  return {
    organization: data,
    isLoading,
    hasOrg: !!data && !error,
    error,
    mutate,
  };
}
