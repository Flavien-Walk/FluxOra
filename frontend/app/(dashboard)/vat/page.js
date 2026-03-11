'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useVatSummary, useVatDeclarations, createVatDeclaration, updateCreditOption } from '@/hooks/useVat';
import { useOrganization } from '@/hooks/useOrganization';
import { Card, CardHeader, CardBody, StatCard } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import {
  AlertCircle, TrendingUp, TrendingDown, Landmark, Scale, Coins,
  CheckCircle, RefreshCw, Archive, FileDown, ShieldAlert, Receipt
} from 'lucide-react';
import { toast } from 'sonner';
import { subMonths, subYears, startOfYear, endOfYear, startOfMonth, endOfMonth } from 'date-fns';
import { cn } from '@/lib/utils';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (v) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(v ?? 0);
const fmtDate = (d) => new Date(d).toLocaleDateString('fr-FR');
const r = (n) => Math.round((n ?? 0) * 100) / 100;

// ─── Composant : Jauge de complétude ──────────────────────────────────────────
function CompletionGauge({ stats }) {
  if (!stats) return null;
  const { totalExpenses, withReceipt, completionPct } = stats;
  const missing = totalExpenses - withReceipt;

  const color = completionPct >= 90
    ? { bar: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-100' }
    : completionPct >= 60
    ? { bar: 'bg-amber-400', text: 'text-amber-700', bg: 'bg-amber-50 border-amber-100' }
    : { bar: 'bg-red-400', text: 'text-red-700', bg: 'bg-red-50 border-red-100' };

  return (
    <div className={`rounded-2xl border p-5 ${color.bg}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Receipt className={`w-5 h-5 ${color.text}`} />
          <span className="font-semibold text-gray-800 text-sm">Complétude des justificatifs</span>
        </div>
        <span className={`text-lg font-bold ${color.text}`}>{completionPct} %</span>
      </div>

      {/* Barre de progression */}
      <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden mb-3">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color.bar}`}
          style={{ width: `${completionPct}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600">
          <span className="font-semibold text-gray-900">{withReceipt}</span> / {totalExpenses} justificatifs associés
        </span>
        {missing > 0 && (
          <Link href="/expenses" className={`text-xs font-medium underline ${color.text}`}>
            {missing} manquant{missing > 1 ? 's' : ''} — Compléter →
          </Link>
        )}
      </div>

      {missing > 0 && (
        <p className="text-xs text-gray-500 mt-2">
          Ajoutez les justificatifs manquants pour maximiser votre récupération de TVA.
        </p>
      )}
    </div>
  );
}

// ─── Composant : Tableau mapping CA3 ──────────────────────────────────────────
function CA3Table({ summary, collectedVAT_details }) {
  const vatDueOrCredit = summary.vatDue > 0 ? summary.vatDue : -summary.vatCredit;

  const rows = [
    { section: 'TVA collectée', cases: [
      { num: '01', label: 'Base imposable taux normal 20 %',        value: collectedVAT_details[20]?.baseHT,    highlight: false },
      { num: '11', label: 'Base imposable taux intermédiaire 10 %', value: collectedVAT_details[10]?.baseHT,    highlight: false },
      { num: '13', label: 'Base imposable taux réduit 5,5 %',       value: collectedVAT_details[5.5]?.baseHT,   highlight: false },
      { num: '08', label: 'Total TVA brute collectée',              value: summary.collectedVAT, highlight: true },
    ]},
    { section: 'TVA déductible', cases: [
      { num: '20', label: 'TVA déductible — biens et services',     value: summary.deductibleVAT_services, highlight: false },
      { num: '21', label: 'TVA déductible — immobilisations',       value: summary.deductibleVAT_assets,   highlight: false },
      { num: '28', label: 'Total TVA déductible',                   value: summary.totalDeductibleVAT,     highlight: true },
    ]},
    { section: 'Résultat', cases: [
      { num: '29', label: summary.vatDue > 0 ? 'TVA nette à payer' : 'Crédit de TVA', value: Math.abs(vatDueOrCredit), highlight: true, isResult: true },
    ]},
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-800">Mapping Formulaire CA3 — DGFiP</h3>
            <p className="text-xs text-gray-400 mt-0.5">Données calculées à partir de vos scans et transactions</p>
          </div>
          <Badge variant="blue">Officieux</Badge>
        </div>
      </CardHeader>
      <CardBody className="p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-16">Case</th>
              <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Libellé</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-32">Montant</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ section, cases }) => (
              <>
                <tr key={section} className="bg-gray-50/50">
                  <td colSpan={3} className="px-5 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide border-t border-b border-gray-100">
                    {section}
                  </td>
                </tr>
                {cases.map(({ num, label, value, highlight, isResult }) => (
                  <tr key={num} className={cn(
                    'border-b border-gray-50 hover:bg-gray-50/50 transition-colors',
                    isResult && (summary.vatDue > 0 ? 'bg-red-50/60' : 'bg-emerald-50/60')
                  )}>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center justify-center w-8 h-7 bg-blue-100 text-blue-700 text-xs font-bold rounded-lg">
                        {num}
                      </span>
                    </td>
                    <td className={cn('px-3 py-3', highlight ? 'font-medium text-gray-900' : 'text-gray-600')}>
                      {label}
                    </td>
                    <td className={cn(
                      'px-5 py-3 text-right tabular-nums',
                      isResult
                        ? summary.vatDue > 0 ? 'font-bold text-red-600 text-base' : 'font-bold text-emerald-600 text-base'
                        : highlight ? 'font-semibold text-gray-900' : 'text-gray-700'
                    )}>
                      {value != null ? fmt(value) : <span className="text-gray-300">—</span>}
                    </td>
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </table>
      </CardBody>
    </Card>
  );
}

// ─── Génération PDF ────────────────────────────────────────────────────────────
async function generateVatPDF({ summary, collectedVAT_details, expenses, fromDate, toDate, orgName, regime }) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const W = 210;
  const MARGIN = 20;
  const COL = W - MARGIN * 2;
  let y = 0;

  const addSection = (title) => {
    y += 4;
    doc.setFillColor(241, 245, 249);
    doc.rect(MARGIN, y, COL, 7, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text(title.toUpperCase(), MARGIN + 3, y + 5);
    y += 10;
    doc.setTextColor(30, 41, 59);
  };

  const addRow = (left, right, bold = false, color = null) => {
    doc.setFontSize(9);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    if (color) doc.setTextColor(...color);
    else doc.setTextColor(30, 41, 59);
    doc.text(left, MARGIN + 2, y);
    doc.text(right, W - MARGIN - 2, y, { align: 'right' });
    y += 6;
    doc.setTextColor(30, 41, 59);
  };

  const addDivider = () => {
    doc.setDrawColor(226, 232, 240);
    doc.line(MARGIN, y, W - MARGIN, y);
    y += 3;
  };

  // ── En-tête ─────────────────────────────────────────────────────────────────
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, W, 28, 'F');
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('FLUXORA', MARGIN, 13);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text('Récapitulatif de préparation à la déclaration de TVA', MARGIN, 20);

  // Bandeau bleu résultat
  const isDue = summary.vatDue > 0;
  doc.setFillColor(isDue ? 220 : 5, isDue ? 38 : 150, isDue ? 38 : 105);
  doc.rect(W - 80, 0, 80, 28, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(255, 255, 255);
  doc.text(isDue ? 'TVA À PAYER' : 'CRÉDIT DE TVA', W - MARGIN, 10, { align: 'right' });
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(fmt(isDue ? summary.vatDue : summary.vatCredit), W - MARGIN, 22, { align: 'right' });

  y = 36;

  // ── Infos entreprise ────────────────────────────────────────────────────────
  addSection('Informations');
  addRow('Entreprise', orgName || '—');
  addRow('Période', `${fmtDate(fromDate)} → ${fmtDate(toDate)}`);
  addRow('Régime fiscal', regime);
  addRow('Généré le', new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }));
  addDivider();

  // ── Synthèse ────────────────────────────────────────────────────────────────
  addSection('Synthèse TVA');
  addRow('TVA collectée (ventes)', fmt(summary.collectedVAT));
  addRow('TVA déductible — biens & services', fmt(summary.deductibleVAT_services));
  addRow('TVA déductible — immobilisations', fmt(summary.deductibleVAT_assets));
  addRow('Total TVA déductible', fmt(summary.totalDeductibleVAT), true);
  addDivider();
  addRow(
    isDue ? '→ TVA NETTE À PAYER' : '→ CRÉDIT DE TVA',
    fmt(isDue ? summary.vatDue : summary.vatCredit),
    true,
    isDue ? [220, 38, 38] : [5, 150, 105]
  );
  y += 2;
  addDivider();

  // ── Mapping CA3 ─────────────────────────────────────────────────────────────
  addSection('Mapping Formulaire CA3 (DGFiP)');
  const ca3Rows = [
    ['01', 'Base imposable 20 % (HT)',       collectedVAT_details[20]?.baseHT],
    ['11', 'Base imposable 10 % (HT)',        collectedVAT_details[10]?.baseHT],
    ['13', 'Base imposable 5,5 % (HT)',       collectedVAT_details[5.5]?.baseHT],
    ['08', 'TVA brute collectée',             summary.collectedVAT],
    ['20', 'TVA déductible biens & services', summary.deductibleVAT_services],
    ['21', 'TVA déductible immobilisations',  summary.deductibleVAT_assets],
    ['28', 'Total TVA déductible',            summary.totalDeductibleVAT],
    ['29', isDue ? 'TVA nette à payer' : 'Crédit de TVA', isDue ? summary.vatDue : summary.vatCredit],
  ];
  ca3Rows.forEach(([num, label, val]) => {
    const isFinal = num === '08' || num === '28' || num === '29';
    doc.setFontSize(9);
    doc.setFont('helvetica', isFinal ? 'bold' : 'normal');
    doc.setTextColor(isFinal ? 15 : 71, isFinal ? 23 : 85, isFinal ? 42 : 99);
    doc.setFillColor(num === '29' ? (isDue ? 254 : 240) : 248, num === '29' ? (isDue ? 242 : 253) : 250, num === '29' ? (isDue ? 242 : 244) : 252);
    doc.rect(MARGIN, y - 4.5, COL, 6.5, 'F');
    doc.text(`[${num}]`, MARGIN + 2, y);
    doc.text(label, MARGIN + 14, y);
    doc.text(val != null ? fmt(val) : '—', W - MARGIN - 2, y, { align: 'right' });
    y += 7;
  });
  y += 2;
  addDivider();

  // ── Justificatifs ───────────────────────────────────────────────────────────
  if (expenses.length > 0) {
    // Check if we need a new page
    if (y > 220) { doc.addPage(); y = 20; }
    addSection(`Justificatifs dépenses (${expenses.length})`);
    const CATS = { marketing: 'Marketing', software: 'Logiciels', salaries: 'Salaires', suppliers: 'Fournisseurs', taxes: 'Taxes', banking: 'Banque', travel: 'Déplacements', office: 'Bureaux', other: 'Autre' };
    expenses.forEach((exp) => {
      if (y > 270) { doc.addPage(); y = 20; }
      const hasReceipt = exp.receiptUrl && exp.receiptUrl.trim() !== '';
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 41, 59);
      doc.text(hasReceipt ? '✓' : '✗', MARGIN + 1, y);
      doc.setTextColor(hasReceipt ? 5 : 220, hasReceipt ? 150 : 38, hasReceipt ? 105 : 38);
      const desc = (exp.description || exp.vendor || '—').substring(0, 40);
      doc.setTextColor(30, 41, 59);
      doc.text(desc, MARGIN + 7, y);
      doc.text(CATS[exp.category] || exp.category, MARGIN + 90, y);
      doc.text(`${exp.vatRate}%`, MARGIN + 125, y);
      doc.text(fmt(exp.vatRecoverable), W - MARGIN - 2, y, { align: 'right' });
      y += 5.5;
    });
    addDivider();
  }

  // ── Disclaimer ──────────────────────────────────────────────────────────────
  if (y > 260) { doc.addPage(); y = 20; }
  y += 3;
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(148, 163, 184);
  doc.text(
    'Outil d\'aide au calcul. La validation finale doit être effectuée sur votre espace impots.gouv.fr. Fluxora ne saurait être tenu',
    MARGIN, y
  );
  y += 4.5;
  doc.text('responsable des erreurs ou omissions dans les montants présentés.', MARGIN, y);

  // Téléchargement
  const period = `${fromDate}_${toDate}`;
  doc.save(`declaration-tva-${period}.pdf`);
}

// ─── Composant : gestion crédit TVA ──────────────────────────────────────────
function CreditOptionManager({ decl, mutate }) {
  const [loading, setLoading] = useState(false);
  const handle = async (option) => {
    setLoading(true);
    try {
      await updateCreditOption(decl._id, option);
      toast.success("Option de crédit mise à jour.");
      mutate();
    } catch (err) {
      toast.error(err.response?.data?.error || "Erreur lors de la mise à jour.");
    } finally {
      setLoading(false);
    }
  };
  if (decl.vatCredit <= 0) return <Button variant="outline" size="sm" disabled>Pas de crédit</Button>;
  if (decl.creditOption === 'carry_forward') return <Badge variant="green"><Archive size={12} className="mr-1" />Reporté</Badge>;
  if (decl.creditOption === 'refund') return <Badge variant="purple"><RefreshCw size={12} className="mr-1" />Remboursé</Badge>;
  return (
    <div className="flex gap-2">
      <Button onClick={() => handle('carry_forward')} variant="outline" size="sm" loading={loading}>Reporter</Button>
      <Button onClick={() => handle('refund')} variant="outline" size="sm" loading={loading}>Rembourser</Button>
    </div>
  );
}

// ─── Composant : historique déclarations ─────────────────────────────────────
function DeclarationsHistory({ mutate }) {
  const { declarations, isLoading } = useVatDeclarations();
  if (isLoading) return <Skeleton className="h-24 w-full" />;
  if (!declarations.length) return (
    <Card><CardBody><p className="text-sm text-gray-500 text-center py-6">Aucune déclaration enregistrée.</p></CardBody></Card>
  );
  return (
    <Card>
      <CardHeader><h3 className="font-semibold text-gray-800">Historique des déclarations</h3></CardHeader>
      <CardBody className="divide-y divide-gray-100 p-0">
        {declarations.map((decl) => (
          <div key={decl._id} className="py-3 px-5 grid grid-cols-2 md:grid-cols-6 gap-4 items-center">
            <div className="col-span-2">
              <p className="font-medium text-gray-800 text-sm">
                {fmtDate(decl.startDate)} → {fmtDate(decl.endDate)}
              </p>
              <Badge variant={decl.regime === 'CA3' ? 'blue' : 'purple'}>{decl.regime}</Badge>
            </div>
            <div>
              <p className="text-xs text-gray-500">TVA due</p>
              <p className="font-medium text-gray-900 text-sm">{fmt(decl.vatDue)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Crédit TVA</p>
              <p className="font-medium text-emerald-600 text-sm">{fmt(decl.vatCredit)}</p>
            </div>
            <div className="col-span-2 flex justify-end items-center gap-2">
              <CreditOptionManager decl={decl} mutate={mutate} />
              <Link href={`/vat/${decl._id}`}>
                <Button variant="outline" size="sm">Détail</Button>
              </Link>
            </div>
          </div>
        ))}
      </CardBody>
    </Card>
  );
}

// ─── Composant : sélecteur de régime ─────────────────────────────────────────
function RegimeSwitcher({ regime, setRegime }) {
  return (
    <div className="flex items-center p-1 bg-gray-100 rounded-lg">
      {['CA3', 'CA12'].map((r) => (
        <button key={r} onClick={() => setRegime(r)}
          className={cn('px-3 py-1 text-sm font-medium rounded-md transition-colors',
            regime === r ? 'bg-white text-accent-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          )}>
          {r === 'CA3' ? 'Mensuel (CA3)' : 'Annuel (CA12)'}
        </button>
      ))}
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function VatPage() {
  const [regime, setRegime] = useState('CA3');
  const [dateRange, setDateRange] = useState();
  const [isCreating, setIsCreating] = useState(false);
  const [isPdfLoading, setIsPdfLoading] = useState(false);

  const { organization } = useOrganization();

  useEffect(() => {
    const today = new Date();
    if (regime === 'CA3') {
      const prev = subMonths(today, 1);
      setDateRange({ from: startOfMonth(prev), to: endOfMonth(prev) });
    } else {
      const prev = subYears(today, 1);
      setDateRange({ from: startOfYear(prev), to: endOfYear(prev) });
    }
  }, [regime]);

  const fromDate = dateRange?.from?.toISOString().split('T')[0];
  const toDate   = dateRange?.to?.toISOString().split('T')[0];

  const { summary, completionStats, expenses, collectedVAT_details, isLoading, error } = useVatSummary(fromDate, toDate);
  const { declarations, mutate: mutateDeclarations } = useVatDeclarations();

  const handleCreateDeclaration = async () => {
    if (!dateRange?.from || !dateRange?.to) return toast.error('Sélectionnez une période complète.');
    setIsCreating(true);
    try {
      await createVatDeclaration({ startDate: fromDate, endDate: toDate, regime });
      toast.success('Déclaration sauvegardée avec succès.');
      mutateDeclarations();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Une erreur est survenue.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleGeneratePDF = async () => {
    if (!summary) return;
    setIsPdfLoading(true);
    try {
      await generateVatPDF({
        summary, collectedVAT_details, expenses,
        fromDate, toDate,
        orgName: organization?.name,
        regime
      });
    } catch (e) {
      toast.error('Erreur lors de la génération du PDF.');
      console.error(e);
    } finally {
      setIsPdfLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* ── Header ────────────────────────────────────────────────────────── */}
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Centre Fiscal — TVA</h1>
            <p className="mt-1 text-sm text-gray-500">
              Préparez votre déclaration {regime} et exportez votre récapitulatif PDF.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <RegimeSwitcher regime={regime} setRegime={setRegime} />
            <DateRangePicker range={dateRange} onSelectRange={setDateRange} />
            <Button onClick={handleCreateDeclaration} disabled={isCreating || !summary} variant="outline">
              {isCreating ? 'Sauvegarde...' : 'Sauvegarder'}
            </Button>
            <Button
              onClick={handleGeneratePDF}
              disabled={isPdfLoading || !summary}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <FileDown className="w-4 h-4" />
              {isPdfLoading ? 'Génération...' : 'Générer mon PDF'}
            </Button>
          </div>
        </header>

        {/* ── Loading / Erreur ──────────────────────────────────────────────── */}
        {(isLoading || !dateRange) && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
          </div>
        )}

        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardBody className="flex items-center gap-4">
              <AlertCircle className="text-red-600 shrink-0" size={24} />
              <div>
                <h3 className="font-semibold text-red-800">Erreur de chargement</h3>
                <p className="text-sm text-red-700">{error.message}</p>
              </div>
            </CardBody>
          </Card>
        )}

        {summary && !isLoading && !error && (
          <>
            {/* ── KPI cards ─────────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <StatCard
                label="Solde de TVA"
                value={fmt(summary.vatDue > 0 ? summary.vatDue : summary.vatCredit)}
                sub={summary.vatDue > 0 ? 'Montant à payer' : 'Crédit de TVA'}
                icon={Scale}
                color={summary.vatDue > 0 ? 'red' : 'green'}
              />
              <StatCard label="TVA Collectée" value={fmt(summary.collectedVAT)} icon={TrendingUp} color="indigo" />
              <StatCard label="TVA Déductible" value={fmt(summary.totalDeductibleVAT)} icon={TrendingDown} color="blue" />
            </div>

            {/* ── Jauge de complétude ───────────────────────────────────────── */}
            <CompletionGauge stats={completionStats} />

            {/* ── Tableau CA3 ───────────────────────────────────────────────── */}
            <CA3Table summary={summary} collectedVAT_details={collectedVAT_details} />

            {/* ── Détail calcul ─────────────────────────────────────────────── */}
            <Card>
              <CardHeader>
                <h3 className="font-semibold text-gray-800">Détail du calcul</h3>
              </CardHeader>
              <CardBody>
                <dl className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b">
                    <dt className="flex items-center gap-2 text-sm font-medium text-gray-600">
                      <TrendingUp size={16} className="text-indigo-500" />TVA Collectée (ventes)
                    </dt>
                    <dd className="text-sm font-semibold text-gray-900 tabular-nums">{fmt(summary.collectedVAT)}</dd>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <dt className="flex items-center gap-2 text-sm font-medium text-gray-600">
                      <TrendingDown size={16} className="text-blue-500" />TVA Déductible (achats)
                    </dt>
                    <dd className="text-sm font-semibold text-gray-900 tabular-nums">{fmt(summary.totalDeductibleVAT)}</dd>
                  </div>
                  <div className="flex justify-between items-center pl-8 pb-2">
                    <dt className="flex items-center gap-2 text-xs text-gray-500"><Coins size={14} />... sur biens et services</dt>
                    <dd className="text-xs text-gray-700 tabular-nums">{fmt(summary.deductibleVAT_services)}</dd>
                  </div>
                  <div className="flex justify-between items-center pl-8 pb-2 border-b">
                    <dt className="flex items-center gap-2 text-xs text-gray-500"><Landmark size={14} />... sur immobilisations</dt>
                    <dd className="text-xs text-gray-700 tabular-nums">{fmt(summary.deductibleVAT_assets)}</dd>
                  </div>
                  <div className="flex justify-between items-center pt-4">
                    <dt className="text-base font-semibold text-gray-800">
                      {summary.vatDue > 0 ? 'TVA à payer' : 'Crédit de TVA'}
                    </dt>
                    <dd className={`text-base font-bold tabular-nums ${summary.vatDue > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {fmt(summary.vatDue > 0 ? summary.vatDue : summary.vatCredit)}
                    </dd>
                  </div>
                </dl>
              </CardBody>
            </Card>

            {/* ── Bouton PDF (aussi en bas) ──────────────────────────────────── */}
            <div className="flex justify-center">
              <button
                onClick={handleGeneratePDF}
                disabled={isPdfLoading}
                className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <FileDown className="w-5 h-5" />
                {isPdfLoading ? 'Génération en cours...' : 'Générer mon PDF de déclaration'}
              </button>
            </div>

            {/* ── Disclaimer ────────────────────────────────────────────────── */}
            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-100 rounded-2xl">
              <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-700">
                <span className="font-semibold">Outil d'aide au calcul.</span> La validation finale doit être effectuée sur votre espace{' '}
                <a href="https://www.impots.gouv.fr" target="_blank" rel="noopener noreferrer" className="underline font-medium">
                  impots.gouv.fr
                </a>. Les montants présentés sont calculés automatiquement à partir de vos transactions et scans — ils ne constituent pas une déclaration fiscale officielle.
              </p>
            </div>
          </>
        )}

        {/* ── Historique des déclarations ───────────────────────────────────── */}
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-4">Historique des déclarations</h2>
          <DeclarationsHistory mutate={mutateDeclarations} />
        </div>
      </div>
    </div>
  );
}
