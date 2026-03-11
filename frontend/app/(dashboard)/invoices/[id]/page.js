'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useInvoice } from '@/hooks/useInvoices';
import api from '@/lib/api';
import Header from '@/components/layout/Header';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import InvoiceForm from '@/components/modules/InvoiceForm';
import ReminderBlock from '@/components/reminders/ReminderBlock';
import { cn } from '@/lib/utils';
import {
  ArrowLeft, Pencil, Trash2, Send, CreditCard, Mail, Clock,
  CheckCircle2, Building2, Banknote, Smartphone, User, FileText,
} from 'lucide-react';

const EVENT_CONFIG = {
  created:           { label: 'Créée',                  color: 'bg-slate-100 text-slate-500',    dot: 'bg-slate-400'   },
  sent:              { label: 'Envoyée par email',       color: 'bg-accent-50 text-accent-600',   dot: 'bg-accent-500'  },
  email_opened:      { label: 'Email ouvert',            color: 'bg-accent-50 text-accent-700',   dot: 'bg-accent-600'  },
  viewed:            { label: 'Consultée',               color: 'bg-accent-50 text-accent-700',   dot: 'bg-accent-600'  },
  payment_initiated: { label: 'Paiement initié',         color: 'bg-purple-50 text-purple-600',   dot: 'bg-purple-500'  },
  paid:              { label: 'Payée',                   color: 'bg-success-50 text-success-700', dot: 'bg-success-500' },
  late:              { label: 'En retard',               color: 'bg-danger-50 text-danger-600',   dot: 'bg-danger-500'  },
  reminder_sent:     { label: 'Rappel envoyé',           color: 'bg-accent-50 text-accent-500',   dot: 'bg-accent-400'  },
};

const fmt = (n) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n ?? 0);
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('fr-FR') : '—');

const PAYMENT_METHODS = [
  { id: 'card',   label: 'Carte bancaire', sub: 'Visa, Mastercard, CB',       Icon: CreditCard, ring: 'border-accent-400 bg-accent-50',   icon: 'text-accent-600'  },
  { id: 'wire',   label: 'Virement SEPA',  sub: 'Délai 1–2 jours ouvrés',    Icon: Building2,  ring: 'border-blue-400 bg-blue-50',        icon: 'text-blue-600'    },
  { id: 'direct', label: 'Prélèvement',    sub: 'Autorisation SEPA requise',  Icon: Banknote,   ring: 'border-violet-400 bg-violet-50',    icon: 'text-violet-600'  },
  { id: 'wallet', label: 'Wallet Fluxora', sub: 'Paiement instantané simulé', Icon: Smartphone, ring: 'border-emerald-400 bg-emerald-50',  icon: 'text-emerald-600' },
];

function PaymentSimulationBlock({ invoice, onMarkPaid, loading }) {
  const [selected, setSelected] = useState('card');
  const [confirmed, setConfirmed] = useState(false);

  const handleConfirm = async () => {
    setConfirmed(true);
    await onMarkPaid();
  };

  if (confirmed) {
    return (
      <div className="bg-success-50 border border-success-200 rounded-xl p-6 flex items-center gap-4">
        <div className="w-10 h-10 bg-success-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <CheckCircle2 size={20} className="text-success-600" />
        </div>
        <div>
          <p className="font-semibold text-success-800">Paiement confirmé</p>
          <p className="text-sm text-success-600 mt-0.5">La facture a été marquée comme payée.</p>
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Procéder au paiement</h3>
            <p className="text-xs text-slate-400 mt-0.5">Simulation — en production via Stripe</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-slate-400 uppercase font-semibold tracking-wide mb-0.5">Total à payer</p>
            <p className="text-xl font-bold text-slate-900 tabular-nums">{fmt(invoice.total)}</p>
          </div>
        </div>
      </CardHeader>
      <CardBody className="space-y-4">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Mode de paiement</p>
        <div className="grid grid-cols-2 gap-3">
          {PAYMENT_METHODS.map(({ id, label, sub, Icon, ring, icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setSelected(id)}
              className={cn(
                'flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left',
                selected === id ? ring : 'border-slate-100 hover:border-slate-200'
              )}
            >
              <div className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                selected === id ? '' : 'bg-slate-100'
              )}>
                <Icon size={16} className={selected === id ? icon : 'text-slate-400'} />
              </div>
              <div>
                <p className={cn('text-xs font-semibold', selected === id ? 'text-slate-900' : 'text-slate-600')}>{label}</p>
                <p className="text-[11px] text-slate-400">{sub}</p>
              </div>
            </button>
          ))}
        </div>

        <div className="bg-slate-50 rounded-xl p-4 text-sm space-y-1.5 border border-slate-100">
          <div className="flex justify-between text-slate-500">
            <span>Facture</span>
            <span className="font-mono text-slate-700">{invoice.number}</span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>Mode</span>
            <span>{PAYMENT_METHODS.find((m) => m.id === selected)?.label}</span>
          </div>
          <div className="flex justify-between font-bold text-slate-900 pt-2 border-t border-slate-200">
            <span>Total à payer</span>
            <span className="tabular-nums">{fmt(invoice.total)}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <Button onClick={handleConfirm} loading={loading} className="flex-1">
            <CheckCircle2 size={15} /> Confirmer le paiement
          </Button>
          <p className="text-xs text-slate-400 text-center leading-tight">
            Sécurisé via<br />Stripe (simulation)
          </p>
        </div>
      </CardBody>
    </Card>
  );
}

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { invoice, isLoading, mutate } = useInvoice(id);
  const [editOpen,       setEditOpen]      = useState(false);
  const [emailOpen,      setEmailOpen]     = useState(false);
  const [loading,        setLoading]       = useState('');
  const [emailOverride,  setEmailOverride] = useState('');
  const [emailSent,      setEmailSent]     = useState(false);

  const updateStatus = async (status) => {
    setLoading(status);
    try {
      await api.put(`/api/invoices/${id}`, { status });
      mutate();
    } finally {
      setLoading('');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Supprimer cette facture ?')) return;
    setLoading('delete');
    try {
      await api.delete(`/api/invoices/${id}`);
      router.push('/invoices');
    } finally {
      setLoading('');
    }
  };

  const handleSendEmail = async (e) => {
    e.preventDefault();
    setLoading('email');
    try {
      await api.post(`/api/invoices/${id}/send-email`, { overrideEmail: emailOverride || undefined });
      setEmailSent(true);
      setEmailOpen(false);
      mutate();
    } catch (err) {
      alert(err.response?.data?.error || "Erreur lors de l'envoi.");
    } finally {
      setLoading('');
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-accent-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!invoice) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-slate-500">Facture introuvable.</p>
      </div>
    );
  }

  const isDraft  = invoice.status === 'draft';
  const isSent   = invoice.status === 'sent';
  const isPaid   = invoice.status === 'paid';
  const canEdit  = isDraft;
  const canDelete = isDraft || invoice.status === 'cancelled';
  const clientEmail = invoice.clientId?.email;

  return (
    <>
      <Header title={invoice.number} />
      <div className="flex-1 p-6 max-w-3xl space-y-5">

        {/* Navigation + actions */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <Link href="/invoices" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors">
            <ArrowLeft size={15} /> Retour aux factures
          </Link>
          <div className="flex gap-2 flex-wrap">
            {canEdit && (
              <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}>
                <Pencil size={14} /> Modifier
              </Button>
            )}
            {!isPaid && (
              <Button variant="secondary" size="sm" onClick={() => { setEmailOverride(clientEmail || ''); setEmailOpen(true); }}>
                <Mail size={14} /> Envoyer par email
              </Button>
            )}
            {isDraft && (
              <Button size="sm" onClick={() => updateStatus('sent')} loading={loading === 'sent'}>
                <Send size={14} /> Marquer envoyée
              </Button>
            )}
            {isSent && (
              <Button size="sm" variant="secondary" onClick={() => updateStatus('paid')} loading={loading === 'paid'}>
                <CreditCard size={14} /> Marquer payée
              </Button>
            )}
            {canDelete && (
              <Button variant="danger" size="sm" onClick={handleDelete} loading={loading === 'delete'}>
                <Trash2 size={14} /> Supprimer
              </Button>
            )}
          </div>
        </div>

        {/* Bannière email envoyé */}
        {emailSent && (
          <div className="bg-success-50 border border-success-200 text-success-700 text-sm px-4 py-2.5 rounded-xl flex items-center gap-2">
            <CheckCircle2 size={15} /> Facture envoyée par email avec succès.
          </div>
        )}

        {/* En-tête facture */}
        <Card>
          <CardBody>
            <div className="flex justify-between items-start flex-wrap gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-xl bg-accent-50 flex items-center justify-center">
                    <FileText size={16} className="text-accent-600" strokeWidth={1.75} />
                  </div>
                  <h2 className="text-2xl font-bold font-mono text-slate-900">{invoice.number}</h2>
                  <Badge status={invoice.status} />
                </div>
                <p className="text-sm text-slate-500">
                  Émise le {fmtDate(invoice.issueDate)}
                  {invoice.dueDate && ` · Échéance le ${fmtDate(invoice.dueDate)}`}
                </p>
                {invoice.sentAt && <p className="text-sm text-accent-600 mt-1">Envoyée le {fmtDate(invoice.sentAt)}</p>}
                {invoice.paidAt && <p className="text-sm text-success-600 mt-1">Payée le {fmtDate(invoice.paidAt)}</p>}
              </div>
              <div className="text-right">
                <p className="text-[11px] text-slate-400 uppercase font-semibold tracking-wide mb-1">Total TTC</p>
                <p className="text-4xl font-bold text-slate-900 tabular-nums">{fmt(invoice.total)}</p>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Client */}
        {invoice.clientId && (
          <Card hover>
            <CardHeader>
              <div className="flex items-center gap-2">
                <User size={13} className="text-slate-400" />
                <h3 className="text-sm font-semibold text-slate-800">Client</h3>
              </div>
            </CardHeader>
            <CardBody>
              <Link href={`/clients/${invoice.clientId._id}`} className="flex items-center gap-3 group">
                <div className="w-9 h-9 bg-accent-50 text-accent-600 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                  {invoice.clientId.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-slate-900 group-hover:text-accent-600 transition-colors">
                    {invoice.clientId.name}
                  </p>
                  {invoice.clientId.company && <p className="text-xs text-slate-500">{invoice.clientId.company}</p>}
                  {invoice.clientId.email && <p className="text-xs text-slate-400">{invoice.clientId.email}</p>}
                </div>
              </Link>
            </CardBody>
          </Card>
        )}

        {/* Lignes de prestation */}
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-slate-800">Prestations</h3>
          </CardHeader>
          <CardBody className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/80 border-b border-slate-100">
                <tr>
                  <th className="text-left px-6 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Description</th>
                  <th className="text-center px-3 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Qté</th>
                  <th className="text-right px-3 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">PU HT</th>
                  <th className="text-center px-3 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">TVA</th>
                  <th className="text-right px-6 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Total HT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {invoice.lines?.map((line, i) => (
                  <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-3.5 text-slate-900 font-medium">{line.description}</td>
                    <td className="px-3 py-3.5 text-center text-slate-600 tabular-nums">{line.quantity}</td>
                    <td className="px-3 py-3.5 text-right text-slate-600 tabular-nums">{fmt(line.unitPrice)}</td>
                    <td className="px-3 py-3.5 text-center text-slate-400">{line.vatRate}%</td>
                    <td className="px-6 py-3.5 text-right font-semibold text-slate-800 tabular-nums">{fmt(line.quantity * line.unitPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-6 py-4 border-t border-slate-100 space-y-1.5 text-sm bg-slate-50/40">
              <div className="flex justify-end gap-8 text-slate-500">
                <span>Sous-total HT</span>
                <span className="w-28 text-right tabular-nums">{fmt(invoice.subtotal)}</span>
              </div>
              <div className="flex justify-end gap-8 text-slate-500">
                <span>TVA</span>
                <span className="w-28 text-right tabular-nums">{fmt(invoice.vatAmount)}</span>
              </div>
              <div className="flex justify-end gap-8 font-bold text-slate-900 text-base pt-2 border-t border-slate-200">
                <span>Total TTC</span>
                <span className="w-28 text-right tabular-nums">{fmt(invoice.total)}</span>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Simulation paiement */}
        {(isSent || invoice.status === 'late') && (
          <PaymentSimulationBlock
            invoice={invoice}
            onMarkPaid={() => updateStatus('paid')}
            loading={loading === 'paid'}
          />
        )}

        {invoice.notes && (
          <Card>
            <CardHeader><h3 className="text-sm font-semibold text-slate-800">Notes</h3></CardHeader>
            <CardBody><p className="text-sm text-slate-600 whitespace-pre-line">{invoice.notes}</p></CardBody>
          </Card>
        )}

        {/* Relances automatiques */}
        {!isPaid && invoice.status !== 'cancelled' && (
          <ReminderBlock doc={invoice} docType="invoice" mutate={mutate} />
        )}

        {/* Timeline des événements */}
        {invoice.events?.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Clock size={13} className="text-slate-400" />
                <h3 className="text-sm font-semibold text-slate-800">Historique</h3>
              </div>
            </CardHeader>
            <CardBody>
              <div className="space-y-0">
                {[...invoice.events].reverse().map((ev, i, arr) => {
                  const cfg = EVENT_CONFIG[ev.type] || { label: ev.type, color: 'bg-slate-100 text-slate-500', dot: 'bg-slate-400' };
                  const isLast = i === arr.length - 1;
                  return (
                    <div key={i} className="flex gap-3 relative">
                      {!isLast && (
                        <div className="absolute left-[11px] top-7 bottom-0 w-px bg-slate-100" />
                      )}
                      <span className={cn('w-6 h-6 rounded-full flex-shrink-0 z-10 border-2 border-white flex items-center justify-center mt-0.5', cfg.dot)}>
                        <span className="w-2 h-2 rounded-full bg-white/80" />
                      </span>
                      <div className="flex-1 pb-4">
                        <div className="flex items-start justify-between gap-2">
                          <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold', cfg.color)}>
                            {cfg.label}
                          </span>
                          <time className="text-[11px] text-slate-400 whitespace-nowrap">
                            {new Date(ev.timestamp).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                          </time>
                        </div>
                        {ev.note && <p className="text-xs text-slate-500 mt-1">{ev.note}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardBody>
          </Card>
        )}
      </div>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Modifier la facture" size="lg">
        <InvoiceForm invoice={invoice} onSuccess={() => { setEditOpen(false); mutate(); }} onCancel={() => setEditOpen(false)} />
      </Modal>

      <Modal open={emailOpen} onClose={() => setEmailOpen(false)} title="Envoyer la facture par email">
        <form onSubmit={handleSendEmail} className="space-y-4">
          <p className="text-sm text-slate-600">
            La facture <strong className="text-slate-900">{invoice.number}</strong> ({fmt(invoice.total)}) sera envoyée par email.
          </p>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email destinataire</label>
            <input
              type="email"
              value={emailOverride}
              onChange={(e) => setEmailOverride(e.target.value)}
              placeholder={clientEmail || 'email@client.com'}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent-500"
            />
            {clientEmail && (
              <p className="text-xs text-slate-400 mt-1">Laissez vide pour utiliser {clientEmail}</p>
            )}
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setEmailOpen(false)}>Annuler</Button>
            <Button type="submit" loading={loading === 'email'}>
              <Send size={14} /> Envoyer
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
