'use client';

import useSWR from 'swr';
import api from '@/lib/api';

const fetcher = (url) => api.get(url).then((r) => r.data);

export function useCards() {
  const { data, error, isLoading, mutate } = useSWR('/api/cards', fetcher, {
    revalidateOnFocus: false,
  });

  return {
    cards: data?.cards || [],
    isLoading,
    error,
    mutate,
  };
}
