import useSWR from 'swr';
import { useAuth } from '@clerk/nextjs';
import api from '../lib/api';

export function useInvestments() {
  const { getToken } = useAuth();
  const { data, error, isLoading, mutate } = useSWR('/api/investments', async (url) => {
    const token = await getToken();
    const { data } = await api.get(url, { headers: { Authorization: `Bearer ${token}` } });
    return data;
  });
  return {
    investments: data?.investments || [],
    totalInvested: data?.totalInvested || 0,
    totalGain: data?.totalGain || 0,
    isLoading,
    error,
    mutate
  };
}

export function useInvestmentProducts() {
  const { getToken } = useAuth();
  const { data, error, isLoading } = useSWR('/api/investments/products', async (url) => {
    const token = await getToken();
    const { data } = await api.get(url, { headers: { Authorization: `Bearer ${token}` } });
    return data;
  }, { refreshInterval: 1000 * 60 * 60 }); // refresh toutes les heures
  return {
    products: data?.products || [],
    isLoading,
    error
  };
}
