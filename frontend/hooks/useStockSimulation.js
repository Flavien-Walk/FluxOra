import useSWR from 'swr';
import api from '../lib/api';

const fetcher = async (url) => (await api.get(url)).data;

// Portefeuille virtuel (espèces + actions), revalorisé toutes les 60 s (cours différés de 15 min)
export function useStockPortfolio() {
  const { data, error, isLoading, mutate } = useSWR('/api/investments/stocks', fetcher, { refreshInterval: 60_000 });
  return {
    positions: data?.positions || [],
    totals: data?.totals || null,
    wallet: data?.wallet || null,
    transactions: data?.transactions || [],
    fees: data?.fees || { rate: 0.001, min: 1 },
    isLoading,
    error,
    mutate,
  };
}

export const stockSimulationApi = {
  buy: async (body) => (await api.post('/api/investments/stocks', body)).data.position,
  sell: async (id, quantity) => (await api.post(`/api/investments/stocks/${id}/sell`, quantity ? { quantity } : {})).data.position,
  remove: async (id) => (await api.delete(`/api/investments/stocks/${id}`)).data,
  deposit: async (amountEur) => (await api.post('/api/investments/stocks/wallet/deposit', { amountEur })).data,
  reset: async (capital) => (await api.post('/api/investments/stocks/wallet/reset', { capital })).data,
};
