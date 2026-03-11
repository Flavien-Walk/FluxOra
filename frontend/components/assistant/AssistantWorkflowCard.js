'use client';

import { CheckCircle2, UserPlus, FileText, RefreshCw, Mail } from 'lucide-react';

const fmt = (n) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n || 0);

/* ── Carte client (à créer ou existant) ─────────────────────── */
function ClientSection({ client }) {
  if (!client) return null;
  const isNew = !client.exists;

  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Client</p>
      <div className="flex items-start gap-2.5 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5">
        {isNew ? (
          <UserPlus size={13} className="mt-0.5 shrink-0 text-violet-500" />
        ) : (
          <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-emerald-500" />
        )}
        <div className="min-w-0">
          <p className="text-[12.5px] font-semibold text-slate-700">{client.name}</p>
          {isNew && (
            <p className="text-[10.5px] text-violet-600 font-medium">Nouveau client à créer</p>
          )}
          {client.email && (
            <p className="text-[10.5px] text-slate-500">{client.email}</p>
          )}
          {client.company && (
            <p className="text-[10.5px] text-slate-500">{client.company}</p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Lignes du document ─────────────────────────────────────── */
function LinesSection({ lines }) {
  if (!lines?.length) return null;

  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Prestation(s)</p>
      <div className="divide-y divide-slate-100 rounded-lg border border-slate-100 overflow-hidden">
        {lines.map((line, i) => (
          <div key={i} className="flex items-center justify-between gap-3 bg-slate-50 px-3 py-2">
            <div className="min-w-0">
              <p className="text-[12px] text-slate-700 truncate">{line.description || 'Prestation'}</p>
              {line.quantity > 1 && (
                <p className="text-[10px] text-slate-400">{line.quantity} × {fmt(line.unitPrice)}</p>
              )}
            </div>
            <p className="shrink-0 text-[12px] font-semibold text-slate-600">
              {fmt(line.quantity * line.unitPrice)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Totaux ─────────────────────────────────────────────────── */
function TotalsSection({ totals, type }) {
  if (!totals) return null;
  const vatPct = totals.subtotal > 0
    ? Math.round((totals.vatAmount / totals.subtotal) * 100)
    : 20;

  return (
    <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2.5 space-y-1">
      <div className="flex justify-between text-[11.5px] text-slate-500">
        <span>HT</span>
        <span className="font-medium text-slate-700">{fmt(totals.subtotal)}</span>
      </div>
      <div className="flex justify-between text-[11.5px] text-slate-500">
        <span>TVA ({vatPct}%)</span>
        <span className="font-medium text-slate-700">{fmt(totals.vatAmount)}</span>
      </div>
      <div className="flex justify-between border-t border-slate-200 pt-1 mt-1 text-[12.5px] font-semibold text-slate-800">
        <span>TTC</span>
        <span>{fmt(totals.total)}</span>
      </div>
    </div>
  );
}

/* ── Mise à jour client ─────────────────────────────────────── */
function UpdateClientSection({ client, fields }) {
  if (!fields) return null;
  const FIELD_LABELS = { email: 'Email', phone: 'Téléphone', company: 'Société', address: 'Adresse', notes: 'Notes' };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5">
        <RefreshCw size={13} className="shrink-0 text-blue-500" />
        <p className="text-[12.5px] font-semibold text-slate-700">{client?.name}</p>
      </div>
      <div className="divide-y divide-slate-100 rounded-lg border border-slate-100 overflow-hidden">
        {Object.entries(fields).map(([key, value]) => (
          <div key={key} className="flex items-center justify-between gap-3 bg-slate-50 px-3 py-2">
            <p className="text-[10.5px] text-slate-400 font-medium">{FIELD_LABELS[key] || key}</p>
            <p className="text-[11.5px] text-slate-700 font-medium truncate max-w-[60%] text-right">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Section envoi email ────────────────────────────────────── */
function EmailSection({ email }) {
  if (!email) return null;
  return (
    <div className="flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2">
      <Mail size={12} className="shrink-0 text-blue-500" />
      <div className="min-w-0">
        <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-wide">Envoi email après création</p>
        <p className="text-[11.5px] text-blue-800 font-medium truncate">{email}</p>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   COMPOSANT PRINCIPAL
   ══════════════════════════════════════════════════════════════ */
export default function AssistantWorkflowCard({ workflow }) {
  if (!workflow) return null;

  const isUpdate    = workflow.type === 'update_client';
  const isInvoice   = workflow.type === 'create_invoice';
  const docLabel    = isInvoice ? 'Facture à créer' : 'Devis à créer';
  const headerColor = isUpdate ? 'text-blue-700 bg-blue-50 border-blue-200' : 'text-violet-700 bg-violet-50 border-violet-200';

  return (
    <div className="mt-3 rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      {/* Header */}
      <div className={`flex items-center gap-2 border-b px-3.5 py-2.5 ${headerColor}`}>
        <FileText size={13} />
        <p className="text-[11.5px] font-semibold">
          {isUpdate ? 'Mise à jour client' : docLabel}
        </p>
        <span className="ml-auto text-[10px] font-medium opacity-70">En attente de confirmation</span>
      </div>

      {/* Body */}
      <div className="p-3.5 space-y-3">
        {isUpdate ? (
          <UpdateClientSection client={workflow.client} fields={workflow.fields} />
        ) : (
          <>
            <ClientSection client={workflow.client} />
            {workflow.lines?.length > 0 && <LinesSection lines={workflow.lines} />}
            {workflow.totals && <TotalsSection totals={workflow.totals} type={workflow.type} />}
            {workflow.sendEmail && <EmailSection email={workflow.recipientEmail} />}
          </>
        )}
      </div>
    </div>
  );
}
