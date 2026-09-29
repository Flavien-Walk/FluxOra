import useSWR from 'swr';
import api from '../lib/api';

const fetcher = async (url) => (await api.get(url)).data;

// Portefeuille d'actions simulé, revalorisé toutes les 60 s (cours différés de 15 min)
export function useStockPortfolio() {
  const { data, error, isLoading, mutate } = useSWR('/api/investments/stocks', fetcher, { refreshInterval: 60_000 });
  return {
    positions: data?.positions || [],
    totals: data?.totals || null,
    fees: data?.fees || { rate: 0.001, min: 1 },
    isLoading,
    error,
    mutate,
  };
}

export const stockSimulationApi = {
  buy: async (body) => (await api.post('/api/investments/stocks', body)).data.position,
  sell: async (id) => (await api.post(`/api/investments/stocks/${id}/sell`)).data.position,
  remove: async (id) => (await api.delete(`/api/investments/stocks/${id}`)).data,
};
