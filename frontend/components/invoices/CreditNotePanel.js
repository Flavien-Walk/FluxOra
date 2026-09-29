'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { FileMinus, Download, CheckCircle2 } from 'lucide-react';
import api from '@/lib/api';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { downloadDocumentPdf } from '@/lib/documentPdf';
import { cn } from '@/lib/utils';

const fetcher = async (url) => (await api.get(url)).data;
const eur = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n || 0);
const STATUS = {
  issued: { label: 'Facture annulée', className: 'bg-slate-100 text-slate-700' },
  to_refund: { label: 'À rembourser', className: 'bg-amber-50 text-amber-900' },
  refunded: { label: 'Remboursé', className: 'bg-emerald-50 text-emerald-700' },
};

/**
 * Avoirs d'une facture émise : création (total ou partiel), remboursement, PDF.
 */
export default function CreditNotePanel({ invoice, org, onChange }) {
  const { data, mutate } = useSWR(`/api/credit-notes?invoiceId=${invoice._id}`, fetcher);
  const creditNotes = data?.creditNotes || [];
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState('full');
  const [reason, setReason] = useState('');
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(null);

  const credited = creditNotes.reduce((s, c) => s + c.subtotal, 0);
  const remaining = Math.max(Math.round((invoice.subtotal - credited) * 100) / 100, 0);
  const canCredit = invoice.status !== 'draft' && invoice.status !== 'cancelled' && remaining > 0;
  const isPaid = invoice.status === 'paid';

  const submit = async (e) => {
    e.preventDefault();
    setBusy('create');
    try {
      const body = { reason };
      if (mode === 'partial') body.amount = amount;
      const { data: res } = await api.post(`/api/invoices/${invoice._id}/credit-note`, body);
      toast.success(`Avoir ${res.creditNote.number} émis${res.invoiceStatus === 'cancelled' ? ' : la facture est annulée.' : '.'}`);
      setOpen(false); setReason(''); setAmount(''); setMode('full');
      mutate(); onChange?.();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Impossible d’émettre l’avoir.');
    } finally {
      setBusy(null);
    }
  };

  const refund = async (cn) => {
    setBusy(cn._id);
    try {
      await api.post(`/api/credit-notes/${cn._id}/refund`);
      toast.success(`Remboursement de ${eur(cn.total)} enregistré.`);
      mutate(); onChange?.();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Enregistrement impossible.');
    } finally {
      setBusy(null);
    }
  };

  if (!canCredit && !creditNotes.length) return null;

  return (
    <Card>
      <CardHeader className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900"><FileMinus size={15} aria-hidden="true" /> Avoirs</h2>
        {canCredit && !open && (
          <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>Émettre un avoir</Button>
        )}
      </CardHeader>
      <CardBody className="space-y-4">
        {open && (
          <form onSubmit={submit} className="space-y-3 rounded-lg border border-slate-200 p-3">
            <p className="text-xs text-slate-600">
              Une facture émise ne se modifie pas : l’avoir l’annule {isPaid ? 'et le montant sera à rembourser au client' : 'et elle ne sera plus relancée'}.
              Reste à créditer : <b>{eur(remaining)} HT</b>.
            </p>
            <div className="flex gap-2" role="radiogroup" aria-label="Type d’avoir">
              {[['full', 'Avoir total'], ['partial', 'Avoir partiel']].map(([id, label]) => (
                <button key={id} type="button" role="radio" aria-checked={mode === id} onClick={() => setMode(id)} disabled={id === 'full' && creditNotes.length > 0}
                  className={cn('rounded-lg border px-3 py-1.5 text-sm disabled:opacity-40', mode === id ? 'border-accent-500 bg-accent-50 text-accent-700' : 'border-slate-200 text-slate-600')}>
                  {label}
                </button>
              ))}
            </div>
            {mode === 'partial' && (
              <div>
                <label htmlFor="cn-amount" className="block text-xs font-medium text-slate-600 mb-1">Montant HT à créditer (€)</label>
                <input id="cn-amount" type="number" min="0.01" step="0.01" max={remaining} value={amount} onChange={(e) => setAmount(e.target.value)} required
                  className="w-full h-9 rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500" />
              </div>
            )}
            <div>
              <label htmlFor="cn-reason" className="block text-xs font-medium text-slate-600 mb-1">Motif (obligatoire)</label>
              <input id="cn-reason" value={reason} onChange={(e) => setReason(e.target.value)} required maxLength={500} placeholder="Ex. : erreur de tarif, prestation annulée, remise commerciale"
                className="w-full h-9 rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500" />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
              <Button type="submit" size="sm" loading={busy === 'create'}>Émettre l’avoir</Button>
            </div>
          </form>
        )}

        {creditNotes.length > 0 ? (
          <ul className="divide-y divide-slate-100">
            {creditNotes.map((cn) => (
              <li key={cn._id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900">{cn.number} <span className={cn('ml-1 rounded-full px-2 py-0.5 text-[11px] font-semibold', STATUS[cn.status]?.className)}>{STATUS[cn.status]?.label}</span></p>
                  <p className="text-xs text-slate-500">{new Date(cn.issueDate).toLocaleDateString('fr-FR')} · {cn.reason}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold tabular-nums text-slate-900">−{eur(cn.total)}</span>
                  <button aria-label={`Télécharger l’avoir ${cn.number} en PDF`} onClick={() => downloadDocumentPdf('creditNote', cn, org, invoice.clientId)}
                    className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-50 hover:text-accent-600"><Download size={15} /></button>
                  {cn.status === 'to_refund' && (
                    <Button size="sm" variant="secondary" onClick={() => refund(cn)} loading={busy === cn._id}><CheckCircle2 size={14} /> Remboursé</Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (!open && <p className="text-sm text-slate-500">Aucun avoir sur cette facture.</p>)}
      </CardBody>
    </Card>
  );
}
