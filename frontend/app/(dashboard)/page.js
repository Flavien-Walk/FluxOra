import Header from '@/components/layout/Header';
import { StatCard } from '@/components/ui/Card';
import { TrendingUp, Clock, AlertTriangle, CreditCard } from 'lucide-react';

export default function DashboardPage() {
  return (
    <>
      <Header title="Dashboard" />
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

        {/* Placeholder graphique */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">
            Évolution du chiffre d'affaires
          </h2>
          <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
            Graphique disponible après connexion au backend
          </div>
        </div>
      </div>
    </>
  );
}
