'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import {
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  CircleAlert,
  Copy,
  FileText,
  Link2,
  Receipt,
  RefreshCcw,
  Search,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import Header from '@/components/layout/Header';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { Card, CardBody, CardHeader, StatCard } from '@/components/ui/Card';
import {
  buildManualReviewMarkdown,
  buildManualReviewReport,
  DEFAULT_REVIEW_DRAFT,
} from '@/lib/manualReview';

const fetcher = (url) => api.get(url).then((response) => response.data);

const fmt = (value) => new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
}).format(value ?? 0);

const fmtDate = (value) => (value ? new Date(value).toLocaleDateString('fr-FR') : 'information manquante');

function createDraft() {
  return {
    payment: { ...DEFAULT_REVIEW_DRAFT.payment },
    duplicate: { ...DEFAULT_REVIEW_DRAFT.duplicate },
    partial: { ...DEFAULT_REVIEW_DRAFT.partial },
    expense: { ...DEFAULT_REVIEW_DRAFT.expense },
  };
}

function toneClasses(tone) {
  if (tone === 'success') {
    return {
      header: 'text-emerald-800 bg-emerald-50 border-emerald-100',
      bullet: 'bg-emerald-500',
      empty: 'text-emerald-600',
    };
  }
  if (tone === 'warning') {
    return {
      header: 'text-amber-800 bg-amber-50 border-amber-100',
      bullet: 'bg-amber-500',
      empty: 'text-amber-600',
    };
  }
  if (tone === 'danger') {
    return {
      header: 'text-rose-800 bg-rose-50 border-rose-100',
      bullet: 'bg-rose-500',
      empty: 'text-rose-600',
    };
  }
  return {
    header: 'text-slate-800 bg-slate-50 border-slate-100',
    bullet: 'bg-slate-400',
    empty: 'text-slate-500',
  };
}

function Field({ label, hint, children }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
      {hint && <span className="block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}

function Input(props) {
  return (
    <input
      {...props}
      className={cn(
        'w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800',
        'focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent',
        props.className,
      )}
    />
  );
}

function SectionCard({ title, items, tone = 'default' }) {
  const theme = toneClasses(tone);

  return (
    <Card>
      <CardHeader className={cn('border-b', theme.header)}>
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
      </CardHeader>
      <CardBody>
        {items.length === 0 ? (
          <p className={cn('text-sm', theme.empty)}>information manquante</p>
        ) : (
          <ul className="space-y-2.5">
            {items.map((item) => (
              <li key={item} className="flex gap-2.5 text-sm text-slate-700 leading-relaxed">
                <span className={cn('mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full', theme.bullet)} />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}

function RecordLink({ href, children }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-sm font-medium text-accent-700 hover:text-accent-800"
    >
      {children}
      <ArrowUpRight size={13} />
    </Link>
  );
}

function InvoiceItem({ invoice }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <RecordLink href={`/invoices/${invoice._id}`}>{invoice.number}</RecordLink>
          <p className="mt-1 text-xs text-slate-500">
            {invoice.clientId?.name || 'information manquante'} · {fmt(invoice.total)}
          </p>
        </div>
        <Badge status={invoice.status} />
      </div>
      <p className="mt-2 text-xs text-slate-400">
        Emise le {fmtDate(invoice.issueDate || invoice.createdAt)} · Echeance {fmtDate(invoice.dueDate)}
      </p>
    </div>
  );
}

function TransactionItem({ transaction }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <RecordLink href="/transactions">{transaction.label || 'Transaction'}</RecordLink>
          <p className="mt-1 text-xs text-slate-500">
            {transaction.party || 'information manquante'} · {fmt(transaction.amount)}
          </p>
        </div>
        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
          {fmtDate(transaction.date)}
        </span>
      </div>
      <p className="mt-2 text-xs text-slate-400">
        Reference : {transaction.reference || 'information manquante'}
      </p>
    </div>
  );
}

function EntryItem({ entry }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <RecordLink href="/accounting">{entry.description || 'Ecriture comptable'}</RecordLink>
          <p className="mt-1 text-xs text-slate-500">
            {fmt(entry.amount)} · {entry.source || 'information manquante'}
          </p>
        </div>
        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
          {entry.type === 'credit' ? 'Credit' : 'Debit'}
        </span>
      </div>
      <p className="mt-2 text-xs text-slate-400">
        Date : {fmtDate(entry.date)} · Reference : {entry.reference || 'information manquante'}
      </p>
    </div>
  );
}

function ExpenseItem({ expense }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <RecordLink href="/expenses">{expense.description || expense.vendor || 'Depense'}</RecordLink>
          <p className="mt-1 text-xs text-slate-500">
            {expense.vendor || 'information manquante'} · {fmt(expense.amount)}
          </p>
        </div>
        <Badge status={expense.status || 'validated'} />
      </div>
      <p className="mt-2 text-xs text-slate-400">
        Date : {fmtDate(expense.date)} · Categorie : {expense.category || 'information manquante'}
      </p>
    </div>
  );
}

function EvidenceCard({ title, subtitle, children }) {
  return (
    <Card>
      <CardHeader>
        <div>
          <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
          {subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}
        </div>
      </CardHeader>
      <CardBody className="space-y-3">{children}</CardBody>
    </Card>
  );
}

function EvidenceGroup({ title, count, children }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</p>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
          {count}
        </span>
      </div>
      {count === 0 ? (
        <p className="text-sm text-slate-400">Aucune correspondance chargee.</p>
      ) : children}
    </div>
  );
}

export default function ReviewsPage() {
  const [draft, setDraft] = useState(createDraft);
  const [copied, setCopied] = useState(false);

  const { data: invoicesData, error: invoicesError, isLoading: invoicesLoading } = useSWR(
    '/api/invoices?limit=200',
    fetcher,
    { revalidateOnFocus: false },
  );
  const { data: transactionsData, error: transactionsError, isLoading: transactionsLoading } = useSWR(
    '/api/transactions?limit=300',
    fetcher,
    { revalidateOnFocus: false },
  );
  const { data: accountingData, error: accountingError, isLoading: accountingLoading } = useSWR(
    '/api/accounting?limit=300',
    fetcher,
    { revalidateOnFocus: false },
  );
  const { data: expensesData, error: expensesError, isLoading: expensesLoading } = useSWR(
    '/api/expenses?limit=200',
    fetcher,
    { revalidateOnFocus: false },
  );

  const invoices = useMemo(() => invoicesData?.invoices || [], [invoicesData]);
  const transactions = useMemo(() => transactionsData?.transactions || [], [transactionsData]);
  const entries = useMemo(() => accountingData?.entries || [], [accountingData]);
  const expenses = useMemo(() => expensesData?.expenses || [], [expensesData]);

  const isLoading = invoicesLoading || transactionsLoading || accountingLoading || expensesLoading;
  const dataErrors = [invoicesError, transactionsError, accountingError, expensesError].filter(Boolean);

  const report = useMemo(() => buildManualReviewReport({
    draft,
    invoices,
    transactions,
    entries,
    expenses,
  }), [draft, invoices, transactions, entries, expenses]);

  const reportText = useMemo(() => buildManualReviewMarkdown(report), [report]);

  const setField = (group, field, value) => {
    setDraft((current) => ({
      ...current,
      [group]: {
        ...current[group],
        [field]: value,
      },
    }));
  };

  const handleReset = () => {
    setDraft(createDraft());
    setCopied(false);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(reportText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <>
      <Header
        title="Contrôles"
        subtitle="Rapprochement manuel prudent"
        actions={(
          <>
            <Button size="sm" variant="secondary" onClick={handleCopy}>
              <Copy size={14} /> {copied ? 'Rapport copié' : 'Copier le rapport'}
            </Button>
            <Button size="sm" variant="ghost" onClick={handleReset}>
              <RefreshCcw size={14} /> Réinitialiser
            </Button>
          </>
        )}
      />

      <div className="flex-1 p-6 space-y-6">
        <div className="relative overflow-hidden rounded-2xl border border-emerald-200/60 bg-gradient-to-br from-emerald-50 via-white to-sky-50">
          <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-emerald-200/40 blur-3xl" />
          <div className="absolute -left-12 bottom-0 h-32 w-32 rounded-full bg-sky-200/30 blur-3xl" />
          <div className="relative z-10 flex flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                <ShieldCheck size={13} />
                Mode prudent
              </div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900">
                Contrôlez vos incidents de facturation sans aucune action automatique
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Cette vue charge les données existantes de Fluxora, sépare ce qui est confirmé de ce qui reste probable,
                et propose uniquement des vérifications manuelles. Aucun statut n est modifié, aucune facture n est créée,
                et aucune suppression n est exécutée.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 lg:w-[360px]">
              <div className="rounded-xl border border-white/70 bg-white/80 p-3 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Factures chargees</p>
                <p className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">{report.meta.counts.invoices}</p>
              </div>
              <div className="rounded-xl border border-white/70 bg-white/80 p-3 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Transactions</p>
                <p className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">{report.meta.counts.transactions}</p>
              </div>
              <div className="rounded-xl border border-white/70 bg-white/80 p-3 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Ecritures</p>
                <p className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">{report.meta.counts.entries}</p>
              </div>
              <div className="rounded-xl border border-white/70 bg-white/80 p-3 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Depenses</p>
                <p className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">{report.meta.counts.expenses}</p>
              </div>
            </div>
          </div>
        </div>

        {dataErrors.length > 0 && (
          <Card className="border-amber-200 bg-amber-50/70">
            <CardBody className="flex items-start gap-3">
              <CircleAlert size={18} className="mt-0.5 flex-shrink-0 text-amber-600" />
              <div>
                <p className="text-sm font-semibold text-amber-800">Certaines donnees n ont pas pu etre chargees</p>
                <p className="mt-1 text-sm text-amber-700">
                  Le rapport peut contenir davantage de sections &quot;information manquante&quot; si une API a repondu avec une
                  erreur ou une authentification incomplete.
                </p>
              </div>
            </CardBody>
          </Card>
        )}

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Search size={15} className="text-accent-600" />
                  <h2 className="text-sm font-semibold text-slate-800">Brouillon de controle</h2>
                </div>
              </CardHeader>
              <CardBody className="space-y-6">
                <div className="grid gap-5 lg:grid-cols-2">
                  <div className="space-y-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">1. Paiement a rapprocher</p>
                      <p className="mt-1 text-xs text-slate-400">Recherche manuelle de facture autour d un encaissement.</p>
                    </div>
                    <Field label="Montant recu">
                      <Input value={draft.payment.amount} onChange={(event) => setField('payment', 'amount', event.target.value)} placeholder="4200" />
                    </Field>
                    <Field label="Date du paiement">
                      <Input type="date" value={draft.payment.date} onChange={(event) => setField('payment', 'date', event.target.value)} />
                    </Field>
                    <Field label="Reference du paiement" hint="Optionnel mais prioritaire pour confirmer un rapprochement.">
                      <Input value={draft.payment.reference} onChange={(event) => setField('payment', 'reference', event.target.value)} placeholder="Ex: INV-2026-014" />
                    </Field>
                    <Field label="Indice client / mission" hint="Nom client, societe ou mot-cle de mission.">
                      <Input value={draft.payment.clientHint} onChange={(event) => setField('payment', 'clientHint', event.target.value)} placeholder="information manquante" />
                    </Field>
                    <Field label="Mot-cle mission">
                      <Input value={draft.payment.missionHint} onChange={(event) => setField('payment', 'missionHint', event.target.value)} placeholder="Optionnel" />
                    </Field>
                  </div>

                  <div className="space-y-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">2. Doublon de facture</p>
                      <p className="mt-1 text-xs text-slate-400">Detection prudente de factures tres proches, sans suppression.</p>
                    </div>
                    <Field label="Montant suspect">
                      <Input value={draft.duplicate.amount} onChange={(event) => setField('duplicate', 'amount', event.target.value)} placeholder="4200" />
                    </Field>
                    <Field label="Indice client">
                      <Input value={draft.duplicate.clientHint} onChange={(event) => setField('duplicate', 'clientHint', event.target.value)} placeholder="information manquante" />
                    </Field>
                    <Field label="Indice mission">
                      <Input value={draft.duplicate.missionHint} onChange={(event) => setField('duplicate', 'missionHint', event.target.value)} placeholder="Nom de mission ou mot-cle" />
                    </Field>
                  </div>

                  <div className="space-y-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">3. Paiement partiel</p>
                      <p className="mt-1 text-xs text-slate-400">Verification d un encaissement partiel sans forcer un statut.</p>
                    </div>
                    <Field label="Montant facture">
                      <Input value={draft.partial.invoiceTotal} onChange={(event) => setField('partial', 'invoiceTotal', event.target.value)} placeholder="1800" />
                    </Field>
                    <Field label="Montant deja recu">
                      <Input value={draft.partial.paidAmount} onChange={(event) => setField('partial', 'paidAmount', event.target.value)} placeholder="1200" />
                    </Field>
                    <Field label="Indice client">
                      <Input value={draft.partial.clientHint} onChange={(event) => setField('partial', 'clientHint', event.target.value)} placeholder="information manquante" />
                    </Field>
                    <Field label="Reference facture / paiement">
                      <Input value={draft.partial.reference} onChange={(event) => setField('partial', 'reference', event.target.value)} placeholder="Optionnel" />
                    </Field>
                  </div>

                  <div className="space-y-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">4. Depense Stripe</p>
                      <p className="mt-1 text-xs text-slate-400">Qualification manuelle de la nature d une charge Stripe.</p>
                    </div>
                    <Field label="Montant depense">
                      <Input value={draft.expense.amount} onChange={(event) => setField('expense', 'amount', event.target.value)} placeholder="320" />
                    </Field>
                    <Field label="Fournisseur / libelle">
                      <Input value={draft.expense.vendorHint} onChange={(event) => setField('expense', 'vendorHint', event.target.value)} placeholder="Stripe" />
                    </Field>
                    <Field label="Date de la charge">
                      <Input type="date" value={draft.expense.date} onChange={(event) => setField('expense', 'date', event.target.value)} />
                    </Field>
                    <Field label="Reference" hint="Ex: reference Stripe, numero de facture, libelle bancaire.">
                      <Input value={draft.expense.reference} onChange={(event) => setField('expense', 'reference', event.target.value)} placeholder="Optionnel" />
                    </Field>
                  </div>
                </div>
              </CardBody>
            </Card>

            <EvidenceCard title="Preuves chargees" subtitle="Les liens menent vers les pages existantes, sans aucune action de modification.">
              <EvidenceGroup
                title="Paiement a rapprocher"
                count={
                  report.evidence.payment.transactionsExact.length +
                  report.evidence.payment.transactionsNearby.length +
                  report.evidence.payment.entriesExact.length +
                  report.evidence.payment.entriesNearby.length +
                  report.evidence.payment.invoicesByReference.length +
                  report.evidence.payment.invoicesByHints.length +
                  report.evidence.payment.invoicesSameAmount.length
                }
              >
                <div className="space-y-3">
                  {report.evidence.payment.transactionsExact.map((transaction) => (
                    <TransactionItem key={`payment-tx-exact-${transaction._id}`} transaction={transaction} />
                  ))}
                  {report.evidence.payment.transactionsNearby.map((transaction) => (
                    <TransactionItem key={`payment-tx-near-${transaction._id}`} transaction={transaction} />
                  ))}
                  {report.evidence.payment.entriesExact.map((entry) => (
                    <EntryItem key={`payment-entry-exact-${entry._id}`} entry={entry} />
                  ))}
                  {report.evidence.payment.entriesNearby.map((entry) => (
                    <EntryItem key={`payment-entry-near-${entry._id}`} entry={entry} />
                  ))}
                  {report.evidence.payment.invoicesByReference.map((invoice) => (
                    <InvoiceItem key={`payment-invoice-ref-${invoice._id}`} invoice={invoice} />
                  ))}
                  {report.evidence.payment.invoicesByHints.map((invoice) => (
                    <InvoiceItem key={`payment-invoice-hint-${invoice._id}`} invoice={invoice} />
                  ))}
                  {report.evidence.payment.invoicesSameAmount.map((invoice) => (
                    <InvoiceItem key={`payment-invoice-amount-${invoice._id}`} invoice={invoice} />
                  ))}
                </div>
              </EvidenceGroup>

              <EvidenceGroup title="Doublons probables" count={report.evidence.duplicates.length}>
                <div className="space-y-3">
                  {report.evidence.duplicates.map((pair) => (
                    <div key={`${pair.left._id}-${pair.right._id}`} className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <RecordLink href={`/invoices/${pair.left._id}`}>{pair.left.number}</RecordLink>
                        <span className="text-slate-300">↔</span>
                        <RecordLink href={`/invoices/${pair.right._id}`}>{pair.right.number}</RecordLink>
                      </div>
                      <p className="mt-2 text-sm text-slate-600">
                        {pair.left.clientId?.name || 'information manquante'} · {fmt(pair.left.total)} · {pair.reasons.join(', ')}
                      </p>
                    </div>
                  ))}
                </div>
              </EvidenceGroup>

              <EvidenceGroup
                title="Paiement partiel"
                count={
                  report.evidence.partial.invoices.length +
                  report.evidence.partial.transactions.length +
                  report.evidence.partial.entries.length
                }
              >
                <div className="space-y-3">
                  {report.evidence.partial.linkedInvoices.map((invoice) => (
                    <InvoiceItem key={`partial-linked-${invoice._id}`} invoice={invoice} />
                  ))}
                  {report.evidence.partial.invoices
                    .filter((invoice) => !report.evidence.partial.linkedInvoices.some((linked) => linked._id === invoice._id))
                    .map((invoice) => (
                      <InvoiceItem key={`partial-invoice-${invoice._id}`} invoice={invoice} />
                    ))}
                  {report.evidence.partial.transactions.map((transaction) => (
                    <TransactionItem key={`partial-tx-${transaction._id}`} transaction={transaction} />
                  ))}
                  {report.evidence.partial.entries.map((entry) => (
                    <EntryItem key={`partial-entry-${entry._id}`} entry={entry} />
                  ))}
                </div>
              </EvidenceGroup>

              <EvidenceGroup
                title="Depense Stripe"
                count={
                  report.evidence.expense.expenses.length +
                  report.evidence.expense.transactions.length +
                  report.evidence.expense.entries.length
                }
              >
                <div className="space-y-3">
                  {report.evidence.expense.expenses.map((expense) => (
                    <ExpenseItem key={`expense-${expense._id}`} expense={expense} />
                  ))}
                  {report.evidence.expense.transactions.map((transaction) => (
                    <TransactionItem key={`expense-tx-${transaction._id}`} transaction={transaction} />
                  ))}
                  {report.evidence.expense.entries.map((entry) => (
                    <EntryItem key={`expense-entry-${entry._id}`} entry={entry} />
                  ))}
                </div>
              </EvidenceGroup>
            </EvidenceCard>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <StatCard
                label="Confirme"
                value={String(report.certain.length)}
                numericValue={report.certain.length}
                formatter={(value) => String(Math.round(value))}
                icon={CheckCircle2}
                color="green"
              />
              <StatCard
                label="Probable"
                value={String(report.probable.length)}
                numericValue={report.probable.length}
                formatter={(value) => String(Math.round(value))}
                icon={Link2}
                color="yellow"
              />
              <StatCard
                label="Manquant"
                value={String(report.missing.length)}
                numericValue={report.missing.length}
                formatter={(value) => String(Math.round(value))}
                icon={CircleAlert}
                color="red"
              />
              <StatCard
                label="Verifications"
                value={String(report.checks.length)}
                numericValue={report.checks.length}
                formatter={(value) => String(Math.round(value))}
                icon={Search}
                color="indigo"
              />
            </div>

            {isLoading && (
              <Card className="border-accent-100 bg-accent-50/50">
                <CardBody className="flex items-center gap-3 text-sm text-accent-700">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
                  Chargement des donnees de verification en cours...
                </CardBody>
              </Card>
            )}

            <SectionCard title="# Résumé de la demande" items={report.summary} />
            <SectionCard title="# Informations certaines" items={report.certain} tone="success" />
            <SectionCard title="# Informations probables" items={report.probable} tone="warning" />
            <SectionCard title="# Informations manquantes" items={report.missing} tone="danger" />
            <SectionCard title="# Vérifications à faire" items={report.checks} />
            <SectionCard title="# Corrections suggérées (sans exécution)" items={report.suggestions} tone="warning" />

            <Card className="border-slate-200">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <FileText size={14} className="text-slate-500" />
                  <h3 className="text-sm font-semibold text-slate-800">Rapport exportable</h3>
                </div>
              </CardHeader>
              <CardBody className="space-y-3">
                <p className="text-sm text-slate-500">
                  Le texte ci-dessous respecte le format structurel attendu pour une restitution prudente.
                </p>
                <pre className="max-h-[340px] overflow-auto rounded-xl border border-slate-100 bg-slate-50 p-4 text-xs leading-6 text-slate-700 whitespace-pre-wrap">
                  {reportText}
                </pre>
              </CardBody>
            </Card>

            <Card className="border-slate-200 bg-slate-50/70">
              <CardBody className="space-y-3">
                <div className="flex items-start gap-3">
                  <Wallet size={18} className="mt-0.5 flex-shrink-0 text-slate-500" />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Sources conseillees pour controler manuellement</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <RecordLink href="/transactions">Transactions</RecordLink>
                      <RecordLink href="/accounting">Comptabilite</RecordLink>
                      <RecordLink href="/invoices">Factures</RecordLink>
                      <RecordLink href="/expenses">Depenses</RecordLink>
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <BookOpen size={18} className="mt-0.5 flex-shrink-0 text-slate-500" />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Capacites produit confirmees</p>
                    <p className="mt-1 text-sm text-slate-600">
                      Fluxora expose des journaux de transactions et de comptabilite, mais l interface locale chargee ne
                      montre pas de statut natif &quot;partiellement payee&quot; ni de suppression automatique depuis cette page.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Receipt size={18} className="mt-0.5 flex-shrink-0 text-slate-500" />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Point d attention</p>
                    <p className="mt-1 text-sm text-slate-600">
                      Les justifications documentaires de depense ne sont pas detaillees ici : si la nature d une charge
                      Stripe reste ambigue, laissez-la en verification manuelle.
                    </p>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
