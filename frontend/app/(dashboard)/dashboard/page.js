'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useOrganization } from '@/hooks/useOrganization';
import { useDashboard } from '@/hooks/useDashboard';
import Header from '@/components/layout/Header';
import { StatCard } from '@/components/ui/Card';
import { TrendingUp, Clock, AlertTriangle, CreditCard } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const fmt = (n) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n ?? 0);

const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

export default function DashboardPage() {
  const router = useRouter();
  const { organization, isLoading: orgLoading, hasOrg } = useOrganization();
  const { summary, isLoading: sumLoading } = useDashboard();

  useEffect(() => {
    if (!orgLoading && !hasOrg) router.replace('/onboarding');
  }, [orgLoading, hasOrg, router]);

  if (orgLoading || !hasOrg) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const chartData = summary?.revenueByMonth?.map((d) => ({
    name: MONTHS[d._id.month - 1],
    CA: d.total,
  })) || [];

  return (
    <>
      <Header title={`Dashboard — ${organization.name}`} />
      <div className="flex-1 p-6 space-y-6">

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Chiffre d'affaires"
            value={sumLoading ? '…' : fmt(summary?.revenue?.total)}
            sub={`Ce mois : ${sumLoading ? '…' : fmt(summary?.revenue?.month)}`}
            icon={TrendingUp}
            color="green"
          />
          <StatCard
            label="En attente"
            value={sumLoading ? '…' : fmt(summary?.pending?.total)}
            sub={`${summary?.pending?.count ?? 0} facture(s) envoyée(s)`}
            icon={Clock}
            color="yellow"
          />
          <StatCard
            label="En retard"
            value={sumLoading ? '…' : String(summary?.lateInvoices ?? 0)}
            sub="Factures impayées dépassées"
            icon={AlertTriangle}
            color="red"
          />
          <StatCard
            label="Dépenses du mois"
            value={sumLoading ? '…' : fmt(summary?.expenses?.month)}
            sub="Mois en cours"
            icon={CreditCard}
            color="indigo"
          />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Évolution du chiffre d'affaires (6 mois)</h2>
          {chartData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
              Les données s'afficheront ici après vos premières factures payées
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="caGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => fmt(v)} labelStyle={{ fontWeight: 600 }} />
                <Area type="monotone" dataKey="CA" stroke="#6366f1" strokeWidth={2} fill="url(#caGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {summary?.expensesByCategory?.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Dépenses par catégorie (année)</h2>
            <div className="space-y-2">
              {summary.expensesByCategory.map((cat) => (
                <div key={cat._id} className="flex justify-between items-center text-sm">
                  <span className="text-gray-600 capitalize">{cat._id || 'Autre'}</span>
                  <span className="font-semibold text-gray-900">{fmt(cat.total)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
