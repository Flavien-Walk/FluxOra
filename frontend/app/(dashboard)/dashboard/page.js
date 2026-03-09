'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useOrganization } from '@/hooks/useOrganization';
import { useDashboard } from '@/hooks/useDashboard';
import { cn } from '@/lib/utils';
import Header from '@/components/layout/Header';
import { StatCard, Card, CardHeader, CardBody } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import {
  TrendingUp, Clock, AlertTriangle, Wallet,
  TrendingDown, FileText, CheckCircle2,
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
        <div className="w-5 h-5 border-2 border-accent-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // 6 derniers mois pour le graphique
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
      <Header title={`Bonjour — ${organization.name}`} subtitle="Vue d'ensemble de votre activité" />
      <div className="flex-1 p-6 space-y-5">

        {/* Bannière relance */}
        {(summary?.relanceInvoices?.length || 0) > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3">
            <Bell size={15} className="text-amber-500 flex-shrink-0" />
            <p className="text-sm text-amber-800 flex-1">
              <span className="font-semibold">{summary.relanceInvoices.length} facture(s)</span> en attente depuis plus de 7 jours — pensez à relancer vos clients.
            </p>
            <Link href="/invoices" className="text-sm font-medium text-amber-700 hover:underline whitespace-nowrap">
              Voir →
            </Link>
          </div>
        )}

        {/* KPIs ligne 1 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Chiffre d'affaires"
            value={sumLoading ? '…' : fmt(summary?.revenue?.total)}
            sub={`Ce mois : ${sumLoading ? '…' : fmt(summary?.revenue?.month)}`}
            icon={TrendingUp}
            color="green"
          />
          <StatCard
            label="Cashflow net"
            value={sumLoading ? '…' : fmt(summary?.cashflowNet)}
            sub={cashflowPositive ? 'Solde positif' : 'Solde négatif'}
            icon={Wallet}
            color={cashflowPositive ? 'indigo' : 'red'}
          />
          <StatCard
            label="En attente"
            value={sumLoading ? '…' : fmt(summary?.pending?.total)}
            sub={`${summary?.pending?.count ?? 0} facture(s)`}
            icon={Clock}
            color="yellow"
          />
          <StatCard
            label="En retard"
            value={sumLoading ? '…' : String(summary?.lateInvoices ?? 0)}
            sub={summary?.lateInvoices > 0 ? 'À relancer' : 'Aucune en retard'}
            icon={AlertTriangle}
            color={summary?.lateInvoices > 0 ? 'red' : 'green'}
          />
        </div>

        {/* KPIs ligne 2 */}
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
          {/* Taux d'acceptation */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-card p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-3">Taux d'acceptation</p>
            {sumLoading ? (
              <div className="h-8 bg-gray-100 rounded-md animate-pulse" />
            ) : summary?.quotes?.acceptanceRate != null ? (
              <>
                <p className="text-2xl font-bold text-gray-900 tabular-nums">
                  {summary.quotes.acceptanceRate}%
                </p>
                <div className="mt-3 h-1 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent-500 rounded-full transition-all duration-700"
                    style={{ width: `${summary.quotes.acceptanceRate}%` }}
                  />
                </div>
              </>
            ) : (
              <p className="text-2xl font-bold text-gray-200">—</p>
            )}
          </div>
        </div>

        {/* Graphique + Catégories */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <Card className="lg:col-span-2">
            <CardHeader>
              <h2 className="text-sm font-semibold text-gray-700">CA sur 6 mois</h2>
            </CardHeader>
            <CardBody>
              <ResponsiveContainer width="100%" height={170}>
                <AreaChart data={last6Months} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="caGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#9ca3af' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`}
                  />
                  <Tooltip
                    formatter={(v) => [fmt(v), 'CA']}
                    contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                    labelStyle={{ fontWeight: 600, color: '#111827' }}
                  />
                  <Area
                    type="monotone" dataKey="CA"
                    stroke="#6366f1" strokeWidth={2}
                    fill="url(#caGrad)"
                    dot={{ fill: '#6366f1', r: 3, strokeWidth: 0 }}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-gray-700">Dépenses par catégorie</h2>
            </CardHeader>
            <CardBody>
              {(summary?.expensesByCategory?.length || 0) === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">Aucune dépense cette année</p>
              ) : (
                <div className="space-y-3">
                  {summary.expensesByCategory.slice(0, 5).map((cat) => {
                    const total = summary.expensesByCategory.reduce((s, c) => s + c.total, 0);
                    const pct   = total > 0 ? Math.round(cat.total / total * 100) : 0;
                    return (
                      <div key={cat._id}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-600 truncate">{CAT_LABELS[cat._id] || cat._id || 'Autre'}</span>
                          <span className="font-semibold text-gray-800 ml-2 tabular-nums">{fmt(cat.total)}</span>
                        </div>
                        <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-accent-400 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Factures récentes + Devis récents */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-700">Factures récentes</h2>
                <Link href="/invoices" className="text-xs text-accent-600 hover:underline flex items-center gap-0.5">
                  Tout voir <ChevronRight size={12} />
                </Link>
              </div>
            </CardHeader>
            <div className="divide-y divide-gray-50">
              {(summary?.recentInvoices?.length || 0) === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">Aucune facture</p>
              ) : summary.recentInvoices.map((inv) => (
                <Link key={inv._id} href={`/invoices/${inv._id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-gray-50/70 transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{inv.number}</p>
                    <p className="text-xs text-gray-400 truncate">{inv.clientId?.name || '—'}</p>
                  </div>
                  <div className="flex items-center gap-2.5 flex-shrink-0">
                    <Badge status={inv.status} />
                    <span className="text-sm font-semibold text-gray-800 tabular-nums">{fmt(inv.total)}</span>
                    <ChevronRight size={13} className="text-gray-300" />
                  </div>
                </Link>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-700">Devis récents</h2>
                <Link href="/quotes" className="text-xs text-accent-600 hover:underline flex items-center gap-0.5">
                  Tout voir <ChevronRight size={12} />
                </Link>
              </div>
            </CardHeader>
            <div className="divide-y divide-gray-50">
              {(summary?.recentQuotes?.length || 0) === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">Aucun devis</p>
              ) : summary.recentQuotes.map((q) => (
                <Link key={q._id} href={`/quotes/${q._id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-gray-50/70 transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{q.number}</p>
                    <p className="text-xs text-gray-400 truncate">{q.clientId?.name || '—'}</p>
                  </div>
                  <div className="flex items-center gap-2.5 flex-shrink-0">
                    <Badge status={q.status} />
                    <span className="text-sm font-semibold text-gray-800 tabular-nums">{fmt(q.total)}</span>
                    <ChevronRight size={13} className="text-gray-300" />
                  </div>
                </Link>
              ))}
            </div>
          </Card>
        </div>

        {/* Factures à relancer */}
        {(summary?.relanceInvoices?.length || 0) > 0 && (
          <Card className="border-amber-200">
            <CardHeader className="border-amber-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell size={14} className="text-amber-500" />
                  <h2 className="text-sm font-semibold text-amber-700">À relancer</h2>
                </div>
                <Link href="/invoices" className="text-xs text-amber-600 hover:underline">Voir toutes →</Link>
              </div>
            </CardHeader>
            <div className="divide-y divide-amber-50">
              {summary.relanceInvoices.map((inv) => (
                <div key={inv._id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{inv.number}</p>
                    <p className="text-xs text-gray-400">{inv.clientId?.name || '—'} · Envoyée le {fmtDate(inv.sentAt)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-amber-700 tabular-nums">{fmt(inv.total)}</span>
                    <Link href={`/invoices/${inv._id}`}
                      className="text-xs text-accent-600 hover:underline flex items-center gap-1">
                      Relancer <ArrowUpRight size={11} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

      </div>
    </>
  );
}
