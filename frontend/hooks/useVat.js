'use client';

import useSWR from 'swr';
import api from '@/lib/api';

const fetcher = (url) => api.get(url).then((res) => res.data);

/**
 * Hook pour récupérer le résumé de la TVA sur une période donnée.
 */
export function useVatSummary(from, to) {
  const canFetch = from && to;
  const url = canFetch ? `/api/vat/summary?from=${from}&to=${to}` : null;

  const { data, error, isLoading } = useSWR(url, fetcher, {
    revalidateOnFocus: false,
  });

  return {
    summary: data,
    completionStats: data?.completionStats || null,
    expenses: data?.expenses || [],
    collectedVAT_details: data?.collectedVAT_details || {},
    isLoading,
    error,
  };
}

/**
 * Hook pour récupérer la liste des déclarations de TVA passées.
 */
export function useVatDeclarations() {
  const { data, error, isLoading, mutate } = useSWR('/api/vat/declarations', fetcher, {
    revalidateOnFocus: false,
  });

  return {
    declarations: data || [],
    isLoading,
    error,
    mutate,
  };
}

/**
 * Fonction pour créer une nouvelle déclaration de TVA.
 * @param {{ startDate: string, endDate: string, regime: 'CA3' | 'CA12' }} data
 */
export const createVatDeclaration = (data) => {
  return api.post('/api/vat/declarations', data);
};

/**
 * Fonction pour mettre à jour l'option de crédit de TVA pour une déclaration.
 * @param {string} declarationId - L'ID de la déclaration
 * @param {'carry_forward' | 'refund'} option - Le choix de l'utilisateur
 */
export const updateCreditOption = (declarationId, option) => {
  return api.put(`/api/vat/declarations/${declarationId}/credit-option`, { creditOption: option });
};

/**
 * Hook pour récupérer le détail d'une déclaration de TVA.
 * @param {string} id - L'ID de la déclaration
 */
export function useVatDeclaration(id) {
  const url = id ? `/api/vat/declarations/${id}` : null;
  const { data, error, isLoading } = useSWR(url, fetcher);

  return {
    declaration: data,
    isLoading,
    error,
  };
}
