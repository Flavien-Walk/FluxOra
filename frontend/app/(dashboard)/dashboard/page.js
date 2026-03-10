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
  Receipt, ClipboardList, CheckCircle2, FileText,
  ChevronRight, ArrowUpRight, Bell,
  Plus, UserPlus, ReceiptText, Send,
  Sparkles, Calendar, CircleDollarSign,
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

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bonjour';
  if (h < 18) return 'Bon après-midi';
  return 'Bonsoir';
}

function getDateLabel() {
  return new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

/* ─── Custom Tooltip chart ────────────────────────────── */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 text-white rounded-xl px-3.5 py-2.5 shadow-lg border border-slate-700">
      <p className="text-[11px] font-medium text-slate-400 mb-1">{label}</p>
      <p className="text-sm font-bold text-white tabular-nums">{fmt(payload[0]?.value)}</p>
    </div>
  );
}

/* ─── Quick Action ────────────────────────────────────── */
function QuickAction({ href, icon: Icon, label, iconBg, iconColor }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 p-3.5 bg-white rounded-xl border border-[rgba(148,163,184,0.3)] shadow-card hover:shadow-card-hover hover:border-[rgba(28,110,242,0.2)] transition-all duration-150 group"
    >
      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', iconBg)}>
        <Icon size={15} className={iconColor} strokeWidth={2} />
      </div>
      <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors">{label}</span>
      <ChevronRight size={13} className="text-slate-300 group-hover:text-slate-500 transition-colors ml-auto flex-shrink-0" />
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

  /* 6 derniers mois */
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
      <Header title="Dashboard" />
      <div className="flex-1 p-6 space-y-5">

        {/* ══════════════════════════════════════════════════
            HERO — Section premium navy gradient
        ══════════════════════════════════════════════════ */}
        <div
          className="relative overflow-hidden rounded-2xl"
          style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1A2744 50%, #0F172A 100%)' }}
        >
          {/* Decorative glows */}
          <div className="absolute top-0 right-0 w-72 h-72 hero-glow-blue"
            style={{ transform: 'translate(35%, -35%)' }} />
          <div className="absolute bottom-0 left-0 w-56 h-56 hero-glow-purple"
            style={{ transform: 'translate(-30%, 30%)' }} />

          <div className="relative z-10 px-6 py-5">
            <div className="flex items-center justify-between gap-6 flex-wrap">
              {/* Left: greeting */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles size={13} className="text-accent-400" />
                  <p className="text-slate-400 text-xs font-medium uppercase tracking-widest">
                    {getGreeting()}
                  </p>
                </div>
                <h2 className="text-white text-xl font-bold tracking-tight">{organization.name}</h2>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <Calendar size={11} className="text-slate-500" />
                  <p className="text-slate-500 text-xs capitalize">{getDateLabel()}</p>
                </div>
              </div>

              {/* Right: mini KPIs premium */}
              {!sumLoading && (
                <div className="flex items-center gap-6 flex-wrap">
                  <div className="text-right">
                    <p className="text-slate-500 text-[11px] uppercase tracking-wide mb-0.5">CA total</p>
                    <p className="text-white text-lg font-bold tabular-nums">
                      {fmt(summary?.revenue?.total)}
                    </p>
                  </div>
                  <div className="w-px h-8 bg-slate-700" />
                  <div className="text-right">
                    <p className="text-slate-500 text-[11px] uppercase tracking-wide mb-0.5">Ce mois</p>
                    <p className="text-accent-400 text-lg font-bold tabular-nums">
                      {fmt(summary?.revenue?.month)}
                    </p>
                  </div>
                  <div className="w-px h-8 bg-slate-700" />
                  <div className="text-right">
                    <p className="text-slate-500 text-[11px] uppercase tracking-wide mb-0.5">Cashflow</p>
                    <p className={cn(
                      'text-lg font-bold tabular-nums',
                      cashflowPositive ? 'text-success-400' : 'text-danger-400'
                    )}>
                      {cashflowPositive ? '+' : ''}{fmt(summary?.cashflowNet)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Bannière alertes ── */}
        {(lateCount > 0 || relanceCount > 0) && (
          <div className="rounded-xl border border-warning-200/60 bg-warning-50 px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-warning-100 flex items-center justify-center flex-shrink-0">
              <Bell size={14} className="text-warning-600" />
            </div>
            <p className="text-sm text-warning-800 flex-1">
              {lateCount > 0 && <><span className="font-semibold">{lateCount} facture(s) en retard</span>{relanceCount > 0 && ' · '}</>}
              {relanceCount > 0 && <span className="font-semibold">{relanceCount} à relancer</span>}
              <span className="text-warning-600"> — pensez à contacter vos clients.</span>
            </p>
            <Link href="/invoices" className="text-sm font-semibold text-warning-700 hover:text-warning-900 whitespace-nowrap flex items-center gap-1">
              Voir <ChevronRight size={13} />
            </Link>
          </div>
        )}

        {/* ══════════════════════════════════════════════════
            KPI CARDS — Ligne 1
        ══════════════════════════════════════════════════ */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Chiffre d'affaires"
            value={sumLoading ? '…' : fmt(summary?.revenue?.total)}
            numericValue={sumLoading ? null : (summary?.revenue?.total ?? 0)}
            formatter={fmt}
            sub={`Ce mois : ${sumLoading ? '…' : fmt(summary?.revenue?.month)}`}
            icon={CircleDollarSign}
            color="green"
          />
          <StatCard
            label="Cashflow net"
            value={sumLoading ? '…' : fmt(summary?.cashflowNet)}
            numericValue={sumLoading ? null : (summary?.cashflowNet ?? 0)}
            formatter={fmt}
            sub={cashflowPositive ? 'Solde positif ✓' : 'Solde négatif'}
            icon={Wallet}
            color={cashflowPositive ? 'indigo' : 'red'}
          />
          <StatCard
            label="Factures en attente"
            value={sumLoading ? '…' : fmt(summary?.pending?.total)}
            numericValue={sumLoading ? null : (summary?.pending?.total ?? 0)}
            formatter={fmt}
            sub={`${summary?.pending?.count ?? 0} facture(s)`}
            icon={Clock}
            color="yellow"
          />
          <StatCard
            label="En retard"
            value={sumLoading ? '…' : String(lateCount)}
            numericValue={sumLoading ? null : lateCount}
            formatter={(n) => String(Math.round(n))}
            sub={lateCount > 0 ? "À relancer d'urgence" : 'Aucune en retard ✓'}
            icon={AlertTriangle}
            color={lateCount > 0 ? 'red' : 'green'}
          />
        </div>

        {/* ── KPI Ligne 2 ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Dépenses du mois"
            value={sumLoading ? '…' : fmt(summary?.expenses?.month)}
            numericValue={sumLoading ? null : (summary?.expenses?.month ?? 0)}
            formatter={fmt}
            sub="Mois en cours"
            icon={Receipt}
            color="rose"
          />
          <StatCard
            label="Devis en cours"
            value={sumLoading ? '…' : String(summary?.quotes?.pendingCount ?? 0)}
            numericValue={sumLoading ? null : (summary?.quotes?.pendingCount ?? 0)}
            formatter={(n) => String(Math.round(n))}
            sub={`Valeur : ${sumLoading ? '…' : fmt(summary?.quotes?.pendingTotal)}`}
            icon={ClipboardList}
            color="blue"
          />
          <StatCard
            label="Devis acceptés"
            value={sumLoading ? '…' : String(summary?.quotes?.acceptedCount ?? 0)}
            numericValue={sumLoading ? null : (summary?.quotes?.acceptedCount ?? 0)}
            formatter={(n) => String(Math.round(n))}
            sub="Depuis le début"
            icon={CheckCircle2}
            color="green"
          />
          {/* Taux acceptation */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-card relative group hover:shadow-card-hover transition-shadow duration-200">
            <div className="p-5">
              <div
                className="w-10 h-10 rounded-xl bg-slate-900 text-accent-400 flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110"
                style={{ boxShadow: '0 0 0 1px rgba(28,110,242,0.12), 0 4px 14px rgba(28,110,242,0.22)' }}
              >
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
                      className="h-full bg-gradient-to-r from-accent-500 to-accent-400 rounded-full transition-all duration-700"
                      style={{ width: `${summary.quotes.acceptanceRate}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-1.5">Taux de conversion devis</p>
                </>
              ) : (
                <p className="text-2xl font-bold text-slate-200">—</p>
              )}
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════
            GRAPHIQUE + ACTIONS RAPIDES
        ══════════════════════════════════════════════════ */}
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
                    {fmt(summary.revenue.total)}
                  </span>
                )}
              </div>
            </CardHeader>
            <CardBody>
              <ResponsiveContainer width="100%" height={190}>
                <AreaChart data={last6Months} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="caGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor="#1C6EF2" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#1C6EF2" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="2 4" stroke="#E2E8F0" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: '#94A3B8', fontWeight: 500 }}
                    axisLine={false} tickLine={false} dy={6}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#94A3B8' }}
                    axisLine={false} tickLine={false} width={44}
                    tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#CBD5E1', strokeWidth: 1 }} />
                  <Area
                    type="monotone" dataKey="CA"
                    stroke="#1C6EF2" strokeWidth={2.5}
                    fill="url(#caGrad)"
                    dot={false}
                    activeDot={{ r: 5, fill: '#1C6EF2', stroke: '#fff', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardBody>
          </Card>

          {/* Actions rapides — 1/3 */}
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-slate-800">Actions rapides</h2>
            </CardHeader>
            <CardBody className="space-y-2.5">
              <QuickAction href="/invoices"  icon={ReceiptText} label="Nouvelle facture"  iconBg="bg-accent-50"   iconColor="text-accent-600" />
              <QuickAction href="/quotes"    icon={FileText}    label="Nouveau devis"     iconBg="bg-purple-50"  iconColor="text-purple-600" />
              <QuickAction href="/expenses"  icon={Plus}        label="Ajouter dépense"   iconBg="bg-warning-50" iconColor="text-warning-600" />
              <QuickAction href="/clients"   icon={UserPlus}    label="Nouveau client"    iconBg="bg-success-50" iconColor="text-success-600" />
              <QuickAction href="/invoices"  icon={ArrowUpRight} label="Relancer client"  iconBg="bg-danger-50"  iconColor="text-danger-500" />
            </CardBody>
          </Card>
        </div>

        {/* ══════════════════════════════════════════════════
            DÉPENSES + FACTURES + DEVIS + TIMELINE
        ══════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Dépenses par catégorie */}
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
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                            <span className="text-slate-600 font-medium truncate">
                              {CAT_LABELS[cat._id] || cat._id || 'Autre'}
                            </span>
                          </div>
                          <span className="font-semibold text-slate-800 ml-2 tabular-nums">{fmt(cat.total)}</span>
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
            <div className="divide-y divide-[rgba(148,163,184,0.15)]">
              {(summary?.recentInvoices?.length || 0) === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">Aucune facture</p>
              ) : summary.recentInvoices.map((inv) => (
                <Link
                  key={inv._id}
                  href={`/invoices/${inv._id}`}
                  className="row-accent flex items-center justify-between px-5 py-3 hover:bg-slate-50/60 transition-colors"
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

          {/* Activity Timeline */}
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-slate-800">Activité récente</h2>
            </CardHeader>
            <CardBody>
              <ActivityTimeline events={activityEvents} isLoading={sumLoading} />
            </CardBody>
          </Card>
        </div>

        {/* ── Devis récents + Relances ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-800">Devis récents</h2>
                <Link href="/quotes" className="text-xs text-accent-600 hover:text-accent-700 font-medium flex items-center gap-0.5">
                  Tout voir <ChevronRight size={12} />
                </Link>
              </div>
            </CardHeader>
            <div className="divide-y divide-[rgba(148,163,184,0.15)]">
              {(summary?.recentQuotes?.length || 0) === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">Aucun devis</p>
              ) : summary.recentQuotes.map((q) => (
                <Link
                  key={q._id}
                  href={`/quotes/${q._id}`}
                  className="row-accent flex items-center justify-between px-5 py-3 hover:bg-slate-50/60 transition-colors"
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

          {/* Relances */}
          {relanceCount > 0 ? (
            <Card className="border-warning-200/60">
              <CardHeader className="border-warning-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-warning-100 flex items-center justify-center">
                      <Bell size={13} className="text-warning-600" />
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold text-warning-800">Relances en attente</h2>
                      <p className="text-xs text-warning-600 mt-0.5">7+ jours sans réponse</p>
                    </div>
                  </div>
                  <Link href="/invoices" className="text-xs font-semibold text-warning-700 hover:text-warning-900 flex items-center gap-1">
                    Gérer <ChevronRight size={12} />
                  </Link>
                </div>
              </CardHeader>
              <div className="divide-y divide-warning-50/80">
                {summary.relanceInvoices.map((inv) => (
                  <div key={inv._id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{inv.number}</p>
                      <p className="text-xs text-slate-400">{inv.clientId?.name || '—'} · {fmtDate(inv.sentAt)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-warning-700 tabular-nums">{fmt(inv.total)}</span>
                      <Link href={`/invoices/${inv._id}`} className="flex items-center gap-1 text-xs font-semibold text-accent-600 hover:text-accent-700">
                        Relancer <ArrowUpRight size={11} />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ) : (
            <Card>
              <CardBody>
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="w-12 h-12 rounded-xl bg-success-50 flex items-center justify-center mb-3">
                    <CheckCircle2 size={20} className="text-success-600" />
                  </div>
                  <p className="text-sm font-semibold text-slate-700">Aucune relance en attente</p>
                  <p className="text-xs text-slate-400 mt-1">Toutes vos factures sont à jour.</p>
                </div>
              </CardBody>
            </Card>
          )}
        </div>

      </div>
    </>
  );
}
