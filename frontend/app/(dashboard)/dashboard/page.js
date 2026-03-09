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
import ActivityTimeline, { buildActivityEvents } from '@/components/ui/ActivityTimeline';
import {
  TrendingUp, Clock, AlertTriangle, Wallet,
  TrendingDown, FileText, CheckCircle2,
  ChevronRight, ArrowUpRight, Bell,
  Plus, UserPlus, ReceiptText, Send,
  Zap,
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

const CAT_COLORS = ['#1C6EF2', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444'];

/* ─── Custom Chart Tooltip ───────────────────────────── */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 text-white rounded-lg px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-slate-300 mb-1">{label}</p>
      <p className="font-bold text-white text-sm tabular-nums">
        {fmt(payload[0]?.value)}
      </p>
    </div>
  );
}

/* ─── Quick Action Button ────────────────────────────── */
function QuickAction({ href, icon: Icon, label, color }) {
  const colorMap = {
    blue:   'bg-accent-50 text-accent-600 hover:bg-accent-100 border-accent-100',
    green:  'bg-success-50 text-success-600 hover:bg-success-100 border-success-100',
    purple: 'bg-purple-50 text-purple-600 hover:bg-purple-100 border-purple-100',
    amber:  'bg-warning-50 text-warning-600 hover:bg-warning-100 border-warning-100',
  };
  return (
    <Link
      href={href}
      className={cn(
        'flex flex-col items-center gap-2 p-4 rounded-xl border',
        'transition-all duration-150 text-center group',
        colorMap[color] ?? colorMap.blue
      )}
    >
      <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/70 group-hover:bg-white transition-colors shadow-xs">
        <Icon size={18} strokeWidth={1.75} />
      </div>
      <span className="text-xs font-semibold leading-tight">{label}</span>
    </Link>
  );
}

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

  /* 6 derniers mois pour le graphique */
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
  const activityEvents   = buildActivityEvents(summary);
  const lateCount        = summary?.lateInvoices ?? 0;
  const relanceCount     = summary?.relanceInvoices?.length ?? 0;

  return (
    <>
      <Header
        title={`Bonjour — ${organization.name}`}
        subtitle="Vue d'ensemble de votre activité"
      />
      <div className="flex-1 p-6 space-y-5">

        {/* ── Bannière alerte ── */}
        {(lateCount > 0 || relanceCount > 0) && (
          <div className="rounded-xl border border-warning-100 bg-warning-50 px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-warning-100 flex items-center justify-center flex-shrink-0">
              <Bell size={14} className="text-warning-600" />
            </div>
            <p className="text-sm text-warning-800 flex-1">
              {lateCount > 0 && (
                <><span className="font-semibold">{lateCount} facture(s) en retard</span>{relanceCount > 0 && ' · '}</>
              )}
              {relanceCount > 0 && (
                <span className="font-semibold">{relanceCount} à relancer</span>
              )}
              <span className="text-warning-700"> — pensez à contacter vos clients.</span>
            </p>
            <Link href="/invoices" className="text-sm font-semibold text-warning-700 hover:text-warning-800 whitespace-nowrap flex items-center gap-1">
              Voir <ChevronRight size={13} />
            </Link>
          </div>
        )}

        {/* ── Actions rapides ── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Zap size={13} className="text-accent-500" />
            <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              Actions rapides
            </h2>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <QuickAction href="/invoices" icon={ReceiptText}  label="Nouvelle facture" color="blue"   />
            <QuickAction href="/quotes"   icon={FileText}     label="Nouveau devis"    color="purple" />
            <QuickAction href="/expenses" icon={Plus}         label="Ajouter dépense"  color="amber"  />
            <QuickAction href="/clients"  icon={UserPlus}     label="Nouveau client"   color="green"  />
          </div>
        </div>

        {/* ── KPIs ligne 1 ── */}
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
            label="Factures en attente"
            value={sumLoading ? '…' : fmt(summary?.pending?.total)}
            sub={`${summary?.pending?.count ?? 0} facture(s)`}
            icon={Clock}
            color="yellow"
          />
          <StatCard
            label="En retard"
            value={sumLoading ? '…' : String(lateCount)}
            sub={lateCount > 0 ? 'À relancer' : 'Aucune en retard'}
            icon={AlertTriangle}
            color={lateCount > 0 ? 'red' : 'green'}
          />
        </div>

        {/* ── KPIs ligne 2 ── */}
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
          <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
            <div className="h-[3px] bg-accent-500" />
            <div className="p-5">
              <div className="w-10 h-10 rounded-xl bg-accent-50 text-accent-600 flex items-center justify-center mb-4">
                <Send size={18} strokeWidth={1.75} />
              </div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-1">
                Taux d'acceptation
              </p>
              {sumLoading ? (
                <div className="h-7 bg-slate-100 rounded animate-pulse" />
              ) : summary?.quotes?.acceptanceRate != null ? (
                <>
                  <p className="text-2xl font-bold text-slate-900 tabular-nums leading-tight">
                    {summary.quotes.acceptanceRate}%
                  </p>
                  <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent-500 rounded-full transition-all duration-700"
                      style={{ width: `${summary.quotes.acceptanceRate}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-1.5">
                    Taux de conversion devis
                  </p>
                </>
              ) : (
                <p className="text-2xl font-bold text-slate-200">—</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Graphique CA + Dépenses + Timeline ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Graphique CA — 2/3 */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-800">Chiffre d'affaires</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Évolution sur 6 mois</p>
                </div>
                {!sumLoading && summary?.revenue?.total > 0 && (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-success-50 text-success-700">
                    Total : {fmt(summary.revenue.total)}
                  </span>
                )}
              </div>
            </CardHeader>
            <CardBody>
              <ResponsiveContainer width="100%" height={190}>
                <AreaChart data={last6Months} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="caGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor="#1C6EF2" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#1C6EF2" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="2 4" stroke="#F1F5F9" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: '#94A3B8', fontWeight: 500 }}
                    axisLine={false}
                    tickLine={false}
                    dy={6}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#94A3B8' }}
                    axisLine={false}
                    tickLine={false}
                    width={44}
                    tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`}
                  />
                  <Tooltip
                    content={<ChartTooltip />}
                    cursor={{ stroke: '#E2E8F0', strokeWidth: 1 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="CA"
                    stroke="#1C6EF2"
                    strokeWidth={2.5}
                    fill="url(#caGrad)"
                    dot={false}
                    activeDot={{ r: 5, fill: '#1C6EF2', strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardBody>
          </Card>

          {/* Dépenses par catégorie — 1/3 */}
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-slate-800">Dépenses</h2>
              <p className="text-xs text-slate-400 mt-0.5">Par catégorie</p>
            </CardHeader>
            <CardBody>
              {(summary?.expensesByCategory?.length || 0) === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">Aucune dépense cette année</p>
              ) : (
                <div className="space-y-3.5">
                  {summary.expensesByCategory.slice(0, 5).map((cat, idx) => {
                    const total = summary.expensesByCategory.reduce((s, c) => s + c.total, 0);
                    const pct   = total > 0 ? Math.round(cat.total / total * 100) : 0;
                    const color = CAT_COLORS[idx] ?? CAT_COLORS[0];
                    return (
                      <div key={cat._id}>
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="text-slate-600 truncate font-medium">
                            {CAT_LABELS[cat._id] || cat._id || 'Autre'}
                          </span>
                          <span className="font-semibold text-slate-800 ml-2 tabular-nums">
                            {fmt(cat.total)}
                          </span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, background: color }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* ── Factures récentes + Devis récents + Timeline ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Factures récentes */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-800">Factures récentes</h2>
                <Link href="/invoices" className="text-xs text-accent-600 hover:text-accent-700 font-medium flex items-center gap-0.5">
                  Tout voir <ChevronRight size={12} />
                </Link>
              </div>
            </CardHeader>
            <div className="divide-y divide-slate-50">
              {(summary?.recentInvoices?.length || 0) === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">Aucune facture</p>
              ) : summary.recentInvoices.map((inv) => (
                <Link
                  key={inv._id}
                  href={`/invoices/${inv._id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-slate-50/80 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{inv.number}</p>
                    <p className="text-xs text-slate-400 truncate">{inv.clientId?.name || '—'}</p>
                  </div>
                  <div className="flex items-center gap-2.5 flex-shrink-0">
                    <Badge status={inv.status} />
                    <span className="text-sm font-semibold text-slate-800 tabular-nums">{fmt(inv.total)}</span>
                    <ChevronRight size={13} className="text-slate-300" />
                  </div>
                </Link>
              ))}
            </div>
          </Card>

          {/* Devis récents */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-800">Devis récents</h2>
                <Link href="/quotes" className="text-xs text-accent-600 hover:text-accent-700 font-medium flex items-center gap-0.5">
                  Tout voir <ChevronRight size={12} />
                </Link>
              </div>
            </CardHeader>
            <div className="divide-y divide-slate-50">
              {(summary?.recentQuotes?.length || 0) === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">Aucun devis</p>
              ) : summary.recentQuotes.map((q) => (
                <Link
                  key={q._id}
                  href={`/quotes/${q._id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-slate-50/80 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{q.number}</p>
                    <p className="text-xs text-slate-400 truncate">{q.clientId?.name || '—'}</p>
                  </div>
                  <div className="flex items-center gap-2.5 flex-shrink-0">
                    <Badge status={q.status} />
                    <span className="text-sm font-semibold text-slate-800 tabular-nums">{fmt(q.total)}</span>
                    <ChevronRight size={13} className="text-slate-300" />
                  </div>
                </Link>
              ))}
            </div>
          </Card>

          {/* Activity Timeline */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-slate-800">Activité récente</h2>
              </div>
            </CardHeader>
            <CardBody>
              <ActivityTimeline
                events={activityEvents}
                isLoading={sumLoading}
              />
            </CardBody>
          </Card>
        </div>

        {/* ── Factures à relancer ── */}
        {relanceCount > 0 && (
          <Card className="border-warning-100">
            <CardHeader className="border-warning-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-warning-100 flex items-center justify-center">
                    <Bell size={13} className="text-warning-600" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-warning-800">Relances en attente</h2>
                    <p className="text-xs text-warning-600 mt-0.5">Factures envoyées sans réponse depuis 7+ jours</p>
                  </div>
                </div>
                <Link href="/invoices" className="text-xs font-semibold text-warning-700 hover:text-warning-800 flex items-center gap-1">
                  Gérer <ChevronRight size={12} />
                </Link>
              </div>
            </CardHeader>
            <div className="divide-y divide-warning-50">
              {summary.relanceInvoices.map((inv) => (
                <div key={inv._id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{inv.number}</p>
                    <p className="text-xs text-slate-400">
                      {inv.clientId?.name || '—'} · Envoyée le {fmtDate(inv.sentAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-warning-700 tabular-nums">
                      {fmt(inv.total)}
                    </span>
                    <Link
                      href={`/invoices/${inv._id}`}
                      className="flex items-center gap-1 text-xs font-semibold text-accent-600 hover:text-accent-700"
                    >
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
