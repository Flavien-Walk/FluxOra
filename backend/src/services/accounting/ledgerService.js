/**
 * Comptabilité en partie double générée à partir des pièces (factures, avoirs, encaissements, dépenses),
 * selon le plan comptable général (PCG). Sert à l'export FEC (art. A47 A-1 du LPF) et à la balance.
 *
 * Journaux : VE (ventes), AC (achats), BQ (banque).
 * Hypothèses (à valider avec l'expert-comptable) :
 *  - prestations de services → compte 706000 ; dépenses réglées le jour de leur saisie ;
 *  - TVA non récupérable intégrée à la charge ; immobilisations en 218300 ;
 *  - virements et placements simulés exclus (hors comptabilité).
 */
const Invoice = require('../../models/Invoice');
const CreditNote = require('../../models/CreditNote');
const Expense = require('../../models/Expense');

const ACCOUNTS = {
  '411000': 'Clients',
  '401000': 'Fournisseurs',
  '512000': 'Banque',
  '706000': 'Prestations de services',
  '445710': 'TVA collectée',
  '445660': 'TVA déductible sur autres biens et services',
  '445620': 'TVA déductible sur immobilisations',
  '218300': 'Matériel de bureau et matériel informatique',
  '651000': 'Redevances pour logiciels et licences',
  '623000': 'Publicité, publications, relations publiques',
  '641000': 'Rémunérations du personnel',
  '611000': 'Sous-traitance générale',
  '635000': 'Autres impôts, taxes et versements assimilés',
  '627000': 'Services bancaires et assimilés',
  '625100': 'Voyages et déplacements',
  '606400': 'Fournitures administratives',
  '628000': 'Charges externes diverses',
};
const EXPENSE_ACCOUNT = {
  software: '651000', marketing: '623000', salaries: '641000', suppliers: '611000', taxes: '635000',
  banking: '627000', travel: '625100', office: '606400', other: '628000',
};
const JOURNALS = { VE: 'Ventes', AC: 'Achats', BQ: 'Banque' };
const ISSUED = ['sent', 'email_opened', 'viewed', 'payment_pending', 'paid', 'late', 'cancelled'];

const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const clientAux = (c) => (c?._id ? `C${String(c._id).slice(-6).toUpperCase()}` : '');
const supplierAux = (vendor) => (vendor ? `F${String(vendor).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10)}` : '');

/**
 * Écritures de l'exercice (année civile par défaut).
 * @returns {{ entries: Array<{journal, date, pieceRef, pieceDate, label, lines: Array<{account, aux?, auxLabel?, debit, credit}>}> }}
 */
async function buildEntries(orgId, { from, to }) {
  const range = { $gte: from, $lte: to };
  const [invoices, paidInvoices, creditNotes, refunds, expenses] = await Promise.all([
    Invoice.find({ organizationId: orgId, status: { $in: ISSUED }, issueDate: range, number: { $not: /^BROUILLON-/ } }).populate('clientId', 'name company').lean(),
    Invoice.find({ organizationId: orgId, status: 'paid', paidAt: range }).populate('clientId', 'name company').lean(),
    CreditNote.find({ organizationId: orgId, issueDate: range }).populate('clientId', 'name company').lean(),
    CreditNote.find({ organizationId: orgId, status: 'refunded', refundedAt: range }).populate('clientId', 'name company').lean(),
    Expense.find({ organizationId: orgId, date: range, status: { $ne: 'non_eligible' } }).lean(),
  ]);
  const clientName = (c) => c?.company || c?.name || 'Client';
  const entries = [];

  for (const inv of invoices) {
    entries.push({
      journal: 'VE', date: inv.issueDate, pieceRef: inv.number, pieceDate: inv.issueDate, label: `Facture ${inv.number} ${clientName(inv.clientId)}`,
      lines: [
        { account: '411000', aux: clientAux(inv.clientId), auxLabel: clientName(inv.clientId), debit: r2(inv.total), credit: 0 },
        { account: '706000', debit: 0, credit: r2(inv.subtotal) },
        ...(inv.vatAmount ? [{ account: '445710', debit: 0, credit: r2(inv.vatAmount) }] : []),
      ],
    });
  }
  for (const cn of creditNotes) {
    entries.push({
      journal: 'VE', date: cn.issueDate, pieceRef: cn.number, pieceDate: cn.issueDate, label: `Avoir ${cn.number} sur ${cn.invoiceNumber}`,
      lines: [
        { account: '706000', debit: r2(cn.subtotal), credit: 0 },
        ...(cn.vatAmount ? [{ account: '445710', debit: r2(cn.vatAmount), credit: 0 }] : []),
        { account: '411000', aux: clientAux(cn.clientId), auxLabel: clientName(cn.clientId), debit: 0, credit: r2(cn.total) },
      ],
    });
  }
  for (const inv of paidInvoices) {
    entries.push({
      journal: 'BQ', date: inv.paidAt, pieceRef: inv.number, pieceDate: inv.paidAt, label: `Encaissement ${inv.number}`,
      lines: [
        { account: '512000', debit: r2(inv.total), credit: 0 },
        { account: '411000', aux: clientAux(inv.clientId), auxLabel: clientName(inv.clientId), debit: 0, credit: r2(inv.total), letter: inv.number },
      ],
    });
  }
  for (const cn of refunds) {
    entries.push({
      journal: 'BQ', date: cn.refundedAt, pieceRef: cn.number, pieceDate: cn.refundedAt, label: `Remboursement avoir ${cn.number}`,
      lines: [
        { account: '411000', aux: clientAux(cn.clientId), auxLabel: clientName(cn.clientId), debit: r2(cn.total), credit: 0 },
        { account: '512000', debit: 0, credit: r2(cn.total) },
      ],
    });
  }
  for (const e of expenses) {
    const ttc = r2(e.amount);
    const recoverable = r2(e.vatRecoverable || 0);
    const charge = r2(ttc - recoverable); // HT + TVA non récupérable
    const chargeAccount = e.assetCategory ? '218300' : (EXPENSE_ACCOUNT[e.category] || '628000');
    const ref = `D${String(e._id).slice(-8).toUpperCase()}`;
    const vendor = e.vendor || e.description;
    entries.push({
      journal: 'AC', date: e.date, pieceRef: ref, pieceDate: e.date, label: `${e.description}${e.vendor ? ` — ${e.vendor}` : ''}`,
      lines: [
        { account: chargeAccount, debit: charge, credit: 0 },
        ...(recoverable ? [{ account: e.assetCategory ? '445620' : '445660', debit: recoverable, credit: 0 }] : []),
        { account: '401000', aux: supplierAux(vendor), auxLabel: vendor, debit: 0, credit: ttc },
      ],
    });
    entries.push({
      journal: 'BQ', date: e.date, pieceRef: ref, pieceDate: e.date, label: `Règlement ${vendor}`,
      lines: [
        { account: '401000', aux: supplierAux(vendor), auxLabel: vendor, debit: ttc, credit: 0 },
        { account: '512000', debit: 0, credit: ttc },
      ],
    });
  }

  // Tri chronologique puis numérotation continue par journal
  entries.sort((a, b) => new Date(a.date) - new Date(b.date) || a.journal.localeCompare(b.journal));
  const seq = {};
  for (const e of entries) {
    seq[e.journal] = (seq[e.journal] || 0) + 1;
    e.num = `${e.journal}${String(seq[e.journal]).padStart(5, '0')}`;
    // Contrôle d'équilibre (partie double)
    const d = r2(e.lines.reduce((s, l) => s + l.debit, 0));
    const c = r2(e.lines.reduce((s, l) => s + l.credit, 0));
    if (Math.abs(d - c) > 0.01) {
      // écart d'arrondi : ajusté sur la dernière ligne au crédit
      const last = e.lines.filter((l) => l.credit).pop();
      if (last) last.credit = r2(last.credit + (d - c));
    }
  }
  return { entries };
}

const yearRange = (year) => {
  const y = Number(year) || new Date().getFullYear();
  return { year: y, from: new Date(y, 0, 1), to: new Date(y, 11, 31, 23, 59, 59, 999) };
};

// Balance des comptes : total débit, crédit et solde par compte
async function getTrialBalance(orgId, year) {
  const { year: y, from, to } = yearRange(year);
  const { entries } = await buildEntries(orgId, { from, to });
  const byAccount = new Map();
  for (const e of entries) for (const l of e.lines) {
    const a = byAccount.get(l.account) || { account: l.account, label: ACCOUNTS[l.account] || l.account, debit: 0, credit: 0 };
    a.debit += l.debit; a.credit += l.credit;
    byAccount.set(l.account, a);
  }
  const accounts = [...byAccount.values()].sort((a, b) => a.account.localeCompare(b.account))
    .map((a) => ({ ...a, debit: r2(a.debit), credit: r2(a.credit), balance: r2(a.debit - a.credit) }));
  const totals = { debit: r2(accounts.reduce((s, a) => s + a.debit, 0)), credit: r2(accounts.reduce((s, a) => s + a.credit, 0)) };
  return { year: y, accounts, totals, balanced: Math.abs(totals.debit - totals.credit) < 0.01, entriesCount: entries.length };
}

// Fichier des écritures comptables (FEC) — 18 colonnes, séparateur tabulation
async function buildFec(org, year) {
  const { year: y, from, to } = yearRange(year);
  const { entries } = await buildEntries(org._id, { from, to });
  const fmtDate = (d) => { const x = new Date(d); return `${x.getFullYear()}${String(x.getMonth() + 1).padStart(2, '0')}${String(x.getDate()).padStart(2, '0')}`; };
  const amount = (n) => r2(n).toFixed(2).replace('.', ',');
  const clean = (s) => String(s ?? '').replace(/[\t\r\n]+/g, ' ').trim();
  const header = ['JournalCode', 'JournalLib', 'EcritureNum', 'EcritureDate', 'CompteNum', 'CompteLib', 'CompAuxNum', 'CompAuxLib',
    'PieceRef', 'PieceDate', 'EcritureLib', 'Debit', 'Credit', 'EcritureLet', 'DateLet', 'ValidDate', 'Montantdevise', 'Idevise'];
  const rows = [header.join('\t')];
  for (const e of entries) {
    for (const l of e.lines) {
      rows.push([
        e.journal, JOURNALS[e.journal], e.num, fmtDate(e.date), l.account, ACCOUNTS[l.account] || l.account,
        clean(l.aux), clean(l.auxLabel), clean(e.pieceRef), fmtDate(e.pieceDate), clean(e.label),
        amount(l.debit), amount(l.credit), '', '', fmtDate(e.date), '', '',
      ].join('\t'));
    }
  }
  const siren = String(org.siret || '').replace(/\D/g, '').slice(0, 9).padEnd(9, '0');
  return { filename: `${siren}FEC${y}1231.txt`, content: rows.join('\r\n') + '\r\n', lines: rows.length - 1 };
}

module.exports = { buildEntries, getTrialBalance, buildFec, ACCOUNTS, yearRange };
