'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useOrganization } from '@/hooks/useOrganization';
import { useDashboard } from '@/hooks/useDashboard';
import Header from '@/components/layout/Header';
import { StatCard } from '@/components/ui/Card';
import {
  TrendingUp, Clock, AlertTriangle, CreditCard,
  Wallet, TrendingDown, FileText, CheckCircle2,
  ChevronRight, ArrowUpRight, Bell,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';

const fmt = (n) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n ?? 0);
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('fr-FR') : '—');

const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

const CAT_LABELS = {
  software: 'Logiciels', marketing: 'Marketing', suppliers: 'Fournisseurs',
  travel: 'Déplacements', office: 'Bureautique', salaries: 'Salaires',
  taxes: 'Taxes', banking: 'Frais bancaires', other: 'Autre',
};

const INV_STATUS = {
  draft:   { label: 'Brouillon',  color: 'bg-gray-100 text-gray-600' },
  sent:    { label: 'Envoyée',    color: 'bg-blue-100 text-blue-700' },
  paid:    { label: 'Payée',      color: 'bg-green-100 text-green-700' },
  late:    { label: 'En retard',  color: 'bg-red-100 text-red-700' },
  cancelled: { label: 'Annulée', color: 'bg-gray-100 text-gray-400' },
};

const QUOTE_STATUS = {
  draft:    { label: 'Brouillon', color: 'bg-gray-100 text-gray-600' },
  sent:     { label: 'Envoyé',    color: 'bg-blue-100 text-blue-700' },
  accepted: { label: 'Accepté',   color: 'bg-green-100 text-green-700' },
  rejected: { label: 'Refusé',    color: 'bg-red-100 text-red-700' },
  expired:  { label: 'Expiré',    color: 'bg-orange-100 text-orange-700' },
};

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

  // Construire les 6 derniers mois pour le graphique (avec 0 si pas de données)
  const now = new Date();
  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    return { year: d.getFullYear(), month: d.getMonth() + 1, name: MONTHS[d.getMonth()], CA: 0 };
  });
  (summary?.revenueByMonth || []).forEach((d) => {
    const slot = last6Months.find((s) => s.year === d._id.year && s.month === d._id.month);
    if (slot) slot.CA = d.total;
  });

  const cashflowPositive = (summary?.cashflowNet ?? 0) >= 0;

  return (
    <>
      <Header title={`Dashboard — ${organization.name}`} />
      <div className="flex-1 p-6 space-y-6">

        {/* Bannière relance */}
        {(summary?.relanceInvoices?.length || 0) > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl px-5 py-3 flex items-center gap-3">
            <Bell size={16} className="text-orange-500 flex-shrink-0" />
            <p className="text-sm text-orange-800 flex-1">
              <span className="font-semibold">{summary.relanceInvoices.length} facture(s)</span> en attente de paiement depuis plus de 7 jours — pensez à relancer vos clients.
            </p>
            <Link href="/invoices" className="text-sm font-medium text-orange-700 hover:underline whitespace-nowrap">
              Voir les factures →
            </Link>
          </div>
        )}

        {/* KPIs Ligne 1 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Chiffre d'affaires"
            value={sumLoading ? '…' : fmt(summary?.revenue?.total)}
            sub={`Ce mois : ${sumLoading ? '…' : fmt(summary?.revenue?.month)}`}
            icon={TrendingUp}
            color="green"
          />
          <StatCard
            label="Cashflow net (mois)"
            value={sumLoading ? '…' : fmt(summary?.cashflowNet)}
            sub={cashflowPositive ? 'Solde positif' : 'Attention : solde négatif'}
            icon={Wallet}
            color={cashflowPositive ? 'indigo' : 'red'}
          />
          <StatCard
            label="Factures en attente"
            value={sumLoading ? '…' : fmt(summary?.pending?.total)}
            sub={`${summary?.pending?.count ?? 0} facture(s) envoyée(s)`}
            icon={Clock}
            color="yellow"
          />
          <StatCard
            label="Factures en retard"
            value={sumLoading ? '…' : String(summary?.lateInvoices ?? 0)}
            sub={summary?.lateInvoices > 0 ? 'À relancer en priorité' : 'Aucune en retard'}
            icon={AlertTriangle}
            color={summary?.lateInvoices > 0 ? 'red' : 'green'}
          />
        </div>

        {/* KPIs Ligne 2 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Dépenses du mois"
            value={sumLoading ? '…' : fmt(summary?.expenses?.month)}
            sub="Mois en cours"
            icon={TrendingDown}
            color="red"
          />
          <StatCard
            label="Devis en cours"
            value={sumLoading ? '…' : String(summary?.quotes?.pendingCount ?? 0)}
            sub={`Valeur : ${sumLoading ? '…' : fmt(summary?.quotes?.pendingTotal)}`}
            icon={FileText}
            color="indigo"
          />
          <StatCard
            label="Devis acceptés"
            value={sumLoading ? '…' : String(summary?.quotes?.acceptedCount ?? 0)}
            sub="Depuis le début"
            icon={CheckCircle2}
            color="green"
          />
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase font-medium mb-1">Taux d'acceptation</p>
            {sumLoading ? (
              <div className="h-8 bg-gray-100 rounded animate-pulse" />
            ) : summary?.quotes?.acceptanceRate != null ? (
              <>
                <p className="text-2xl font-bold text-gray-900">{summary.quotes.acceptanceRate}%</p>
                <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full"
                    style={{ width: `${summary.quotes.acceptanceRate}%` }}
                  />
                </div>
              </>
            ) : (
              <p className="text-2xl font-bold text-gray-300">—</p>
            )}
          </div>
        </div>

        {/* Graphique CA + Dépenses catégories */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Évolution du chiffre d'affaires (6 mois)</h2>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={last6Months} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="caGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`} />
                <Tooltip formatter={(v) => fmt(v)} labelStyle={{ fontWeight: 600 }} />
                <Area type="monotone" dataKey="CA" stroke="#6366f1" strokeWidth={2} fill="url(#caGradient)" dot={{ fill: '#6366f1', r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Dépenses par catégorie</h2>
            {(summary?.expensesByCategory?.length || 0) === 0 ? (
              <p className="text-sm text-gray-400 mt-8 text-center">Aucune dépense cette année</p>
            ) : (
              <div className="space-y-3">
                {summary.expensesByCategory.slice(0, 5).map((cat) => {
                  const totalCat = summary.expensesByCategory.reduce((s, c) => s + c.total, 0);
                  const pct = totalCat > 0 ? Math.round(cat.total / totalCat * 100) : 0;
                  return (
                    <div key={cat._id}>
                      <div className="flex justify-between text-xs mb-0.5">
                        <span className="text-gray-600">{CAT_LABELS[cat._id] || cat._id || 'Autre'}</span>
                        <span className="font-semibold text-gray-800">{fmt(cat.total)}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Factures récentes + Devis récents */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Factures récentes */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-700">Factures récentes</h2>
              <Link href="/invoices" className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                Tout voir <ChevronRight size={12} />
              </Link>
            </div>
            <div className="divide-y divide-gray-50">
              {(summary?.recentInvoices?.length || 0) === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">Aucune facture</p>
              ) : summary.recentInvoices.map((inv) => {
                const st = INV_STATUS[inv.status] || INV_STATUS.draft;
                return (
                  <Link key={inv._id} href={`/invoices/${inv._id}`} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{inv.number}</p>
                      <p className="text-xs text-gray-400 truncate">{inv.clientId?.name || '—'}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.color}`}>{st.label}</span>
                      <span className="text-sm font-semibold text-gray-800">{fmt(inv.total)}</span>
                      <ChevronRight size={14} className="text-gray-300" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Devis récents */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-700">Devis récents</h2>
              <Link href="/quotes" className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                Tout voir <ChevronRight size={12} />
              </Link>
            </div>
            <div className="divide-y divide-gray-50">
              {(summary?.recentQuotes?.length || 0) === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">Aucun devis</p>
              ) : summary.recentQuotes.map((q) => {
                const st = QUOTE_STATUS[q.status] || QUOTE_STATUS.draft;
                return (
                  <Link key={q._id} href={`/quotes/${q._id}`} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{q.number}</p>
                      <p className="text-xs text-gray-400 truncate">{q.clientId?.name || '—'}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.color}`}>{st.label}</span>
                      <span className="text-sm font-semibold text-gray-800">{fmt(q.total)}</span>
                      <ChevronRight size={14} className="text-gray-300" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* À relancer */}
        {(summary?.relanceInvoices?.length || 0) > 0 && (
          <div className="bg-white rounded-xl border border-orange-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-orange-100">
              <div className="flex items-center gap-2">
                <Bell size={15} className="text-orange-500" />
                <h2 className="text-sm font-semibold text-orange-700">Factures à relancer</h2>
              </div>
              <Link href="/invoices" className="text-xs text-orange-600 hover:underline">Voir toutes →</Link>
            </div>
            <div className="divide-y divide-orange-50">
              {summary.relanceInvoices.map((inv) => (
                <div key={inv._id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{inv.number}</p>
                    <p className="text-xs text-gray-400">{inv.clientId?.name || '—'} · Envoyée le {fmtDate(inv.sentAt)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-orange-700">{fmt(inv.total)}</span>
                    <Link href={`/invoices/${inv._id}`} className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                      Relancer <ArrowUpRight size={12} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </>
  );
}
