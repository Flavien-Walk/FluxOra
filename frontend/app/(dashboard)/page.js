'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useOrganization } from '@/hooks/useOrganization';
import Header from '@/components/layout/Header';
import { StatCard } from '@/components/ui/Card';
import { TrendingUp, Clock, AlertTriangle, CreditCard } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const { organization, isLoading, hasOrg } = useOrganization();

  // Si pas d'organisation → onboarding
  useEffect(() => {
    if (!isLoading && !hasOrg) {
      router.replace('/onboarding');
    }
  }, [isLoading, hasOrg, router]);

  if (isLoading || !hasOrg) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Header title={`Dashboard — ${organization.name}`} />
      <div className="flex-1 p-6 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Chiffre d'affaires"
            value="—"
            sub="Total factures payées"
            icon={TrendingUp}
            color="green"
          />
          <StatCard
            label="En attente"
            value="—"
            sub="Factures envoyées"
            icon={Clock}
            color="yellow"
          />
          <StatCard
            label="En retard"
            value="—"
            sub="Factures impayées"
            icon={AlertTriangle}
            color="red"
          />
          <StatCard
            label="Dépenses du mois"
            value="—"
            sub="Mois en cours"
            icon={CreditCard}
            color="indigo"
          />
        </div>

        {/* Graphique placeholder */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">
            Évolution du chiffre d'affaires
          </h2>
          <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
            Les données s'afficheront ici après vos premières factures
          </div>
        </div>
      </div>
    </>
  );
}
