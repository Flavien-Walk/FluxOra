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
import { ArrowLeft, Pencil, Trash2, Send, CreditCard, Mail, Clock, CheckCircle2, Building2, Banknote, Smartphone } from 'lucide-react';

const EVENT_CONFIG = {
  created:           { label: 'Créée',                  color: 'bg-gray-100 text-gray-500' },
  sent:              { label: 'Envoyée par email',       color: 'bg-blue-100 text-blue-600' },
  email_opened:      { label: 'Email ouvert',            color: 'bg-indigo-100 text-indigo-600' },
  viewed:            { label: 'Consultée par le client', color: 'bg-indigo-100 text-indigo-600' },
  payment_initiated: { label: 'Paiement initié',         color: 'bg-purple-100 text-purple-600' },
  paid:              { label: 'Payée',                   color: 'bg-green-100 text-green-600' },
  late:              { label: 'En retard',               color: 'bg-red-100 text-red-500' },
  reminder_sent:     { label: 'Rappel envoyé',           color: 'bg-blue-100 text-blue-500' },
};

const fmt = (n) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n ?? 0);
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('fr-FR') : '—');

const PAYMENT_METHODS = [
  { id: 'card',    label: 'Carte bancaire',  sub: 'Visa, Mastercard, CB',       Icon: CreditCard,  color: 'indigo' },
  { id: 'wire',    label: 'Virement SEPA',   sub: 'Délai 1–2 jours ouvrés',    Icon: Building2,   color: 'blue'   },
  { id: 'direct',  label: 'Prélèvement',     sub: 'Autorisation SEPA requise',  Icon: Banknote,    color: 'violet' },
  { id: 'wallet',  label: 'Wallet Fluxora',  sub: 'Paiement instantané simulé', Icon: Smartphone,  color: 'emerald'},
];

const COLOR_RING = {
  indigo:  'border-indigo-400 bg-indigo-50',
  blue:    'border-blue-400 bg-blue-50',
  violet:  'border-violet-400 bg-violet-50',
  emerald: 'border-emerald-400 bg-emerald-50',
};
const COLOR_ICON = {
  indigo:  'text-indigo-600',
  blue:    'text-blue-600',
  violet:  'text-violet-600',
  emerald: 'text-emerald-600',
};

function PaymentSimulationBlock({ invoice, onMarkPaid, loading }) {
  const [selected, setSelected] = useState('card');
  const [confirmed, setConfirmed] = useState(false);

  const fmt = (n) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n ?? 0);

  const handleConfirm = async () => {
    setConfirmed(true);
    await onMarkPaid();
  };

  if (confirmed) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-6 flex items-center gap-4">
        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
          <CheckCircle2 size={20} className="text-green-600" />
        </div>
        <div>
          <p className="font-semibold text-green-800">Paiement confirmé</p>
          <p className="text-sm text-green-600">La facture a été marquée comme payée.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-700">Procéder au paiement</h3>
          <p className="text-xs text-gray-400 mt-0.5">Simulation — en production via Stripe</p>
        </div>
        <p className="text-xl font-bold text-gray-900">{fmt(invoice.total)}</p>
      </div>

      <div className="p-6 space-y-4">
        {/* Choix du mode de paiement */}
        <p className="text-xs font-medium text-gray-500 uppercase">Mode de paiement</p>
        <div className="grid grid-cols-2 gap-3">
          {PAYMENT_METHODS.map(({ id, label, sub, Icon, color }) => (
            <button
              key={id}
              type="button"
              onClick={() => setSelected(id)}
              className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                selected === id ? COLOR_RING[color] : 'border-gray-100 hover:border-gray-200'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${selected === id ? '' : 'bg-gray-100'}`}>
                <Icon size={16} className={selected === id ? COLOR_ICON[color] : 'text-gray-400'} />
              </div>
              <div>
                <p className={`text-xs font-semibold ${selected === id ? 'text-gray-900' : 'text-gray-600'}`}>{label}</p>
                <p className="text-xs text-gray-400">{sub}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Récapitulatif */}
        <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-1">
          <div className="flex justify-between text-gray-500">
            <span>Facture</span>
            <span className="font-mono">{invoice.number}</span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>Mode</span>
            <span>{PAYMENT_METHODS.find((m) => m.id === selected)?.label}</span>
          </div>
          <div className="flex justify-between font-bold text-gray-900 pt-1 border-t border-gray-200">
            <span>Total à payer</span>
            <span>{fmt(invoice.total)}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <Button onClick={handleConfirm} loading={loading} className="flex-1">
            <CheckCircle2 size={15} />
            Confirmer le paiement
          </Button>
          <p className="text-xs text-gray-400 text-center">
            Sécurisé via<br />Stripe (simulation)
          </p>
        </div>
      </div>
    </div>
  );
}

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { invoice, isLoading, mutate } = useInvoice(id);
  const [editOpen, setEditOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [loading, setLoading] = useState('');
  const [emailOverride, setEmailOverride] = useState('');
  const [emailSent, setEmailSent] = useState(false);

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
      await api.post(`/api/invoices/${id}/send-email`, {
        overrideEmail: emailOverride || undefined,
      });
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
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!invoice) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-500">Facture introuvable.</p>
      </div>
    );
  }

  const isDraft = invoice.status === 'draft';
  const isSent = invoice.status === 'sent';
  const isPaid = invoice.status === 'paid';
  const canEdit = isDraft;
  const canDelete = isDraft || invoice.status === 'cancelled';
  const clientEmail = invoice.clientId?.email;

  return (
    <>
      <Header title={invoice.number} />
      <div className="flex-1 p-6 max-w-3xl space-y-5">

        {/* Navigation + actions */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <Link href="/invoices" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800">
            <ArrowLeft size={15} /> Retour aux factures
          </Link>
          <div className="flex gap-2 flex-wrap">
            {canEdit && (
              <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}>
                <Pencil size={14} /> Modifier
              </Button>
            )}
            {!isPaid && (
              <Button variant="secondary" size="sm" onClick={() => { setEmailOverride(clientEmail || ''); setEmailOpen(true); }} loading={loading === 'email'}>
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

        {emailSent && (
          <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-2 rounded-lg">
            ✓ Facture envoyée par email avec succès.
          </div>
        )}

        {/* En-tête facture */}
        <Card>
          <CardBody>
            <div className="flex justify-between items-start flex-wrap gap-4">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <h2 className="text-2xl font-bold font-mono text-gray-900">{invoice.number}</h2>
                  <Badge status={invoice.status} />
                </div>
                <p className="text-sm text-gray-500">
                  Émise le {fmtDate(invoice.issueDate)}
                  {invoice.dueDate && ` · Échéance le ${fmtDate(invoice.dueDate)}`}
                </p>
                {invoice.sentAt && <p className="text-sm text-blue-600 mt-1">Envoyée le {fmtDate(invoice.sentAt)}</p>}
                {invoice.paidAt && <p className="text-sm text-green-600 mt-1">Payée le {fmtDate(invoice.paidAt)}</p>}
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400 uppercase font-medium">Total TTC</p>
                <p className="text-3xl font-bold text-gray-900">{fmt(invoice.total)}</p>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Client */}
        {invoice.clientId && (
          <Card>
            <CardHeader><h3 className="text-sm font-semibold text-gray-700">Client</h3></CardHeader>
            <CardBody>
              <Link href={`/clients/${invoice.clientId._id}`} className="hover:text-indigo-600">
                <p className="font-medium text-gray-900">{invoice.clientId.name}</p>
                {invoice.clientId.company && <p className="text-sm text-gray-500">{invoice.clientId.company}</p>}
                {invoice.clientId.email && <p className="text-sm text-gray-500">{invoice.clientId.email}</p>}
              </Link>
            </CardBody>
          </Card>
        )}

        {/* Lignes */}
        <Card>
          <CardHeader><h3 className="text-sm font-semibold text-gray-700">Prestations</h3></CardHeader>
          <CardBody className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="text-center px-3 py-3 text-xs font-medium text-gray-500 uppercase">Qté</th>
                  <th className="text-right px-3 py-3 text-xs font-medium text-gray-500 uppercase">PU HT</th>
                  <th className="text-center px-3 py-3 text-xs font-medium text-gray-500 uppercase">TVA</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Total HT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoice.lines?.map((line, i) => (
                  <tr key={i}>
                    <td className="px-6 py-3 text-gray-900">{line.description}</td>
                    <td className="px-3 py-3 text-center text-gray-600">{line.quantity}</td>
                    <td className="px-3 py-3 text-right text-gray-600">{fmt(line.unitPrice)}</td>
                    <td className="px-3 py-3 text-center text-gray-500">{line.vatRate}%</td>
                    <td className="px-6 py-3 text-right font-medium">{fmt(line.quantity * line.unitPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-6 py-4 border-t border-gray-100 space-y-1 text-sm">
              <div className="flex justify-end gap-8 text-gray-600">
                <span>Sous-total HT</span><span className="w-24 text-right">{fmt(invoice.subtotal)}</span>
              </div>
              <div className="flex justify-end gap-8 text-gray-600">
                <span>TVA</span><span className="w-24 text-right">{fmt(invoice.vatAmount)}</span>
              </div>
              <div className="flex justify-end gap-8 font-bold text-gray-900 text-base pt-2 border-t border-gray-200">
                <span>Total TTC</span><span className="w-24 text-right">{fmt(invoice.total)}</span>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Simulation paiement (visible si facture envoyée ou en retard) */}
        {(isSent || invoice.status === 'late') && (
          <PaymentSimulationBlock
            invoice={invoice}
            onMarkPaid={() => updateStatus('paid')}
            loading={loading === 'paid'}
          />
        )}

        {invoice.notes && (
          <Card>
            <CardHeader><h3 className="text-sm font-semibold text-gray-700">Notes</h3></CardHeader>
            <CardBody><p className="text-sm text-gray-600 whitespace-pre-line">{invoice.notes}</p></CardBody>
          </Card>
        )}

        {invoice.events?.length > 0 && (
          <Card>
            <CardHeader>
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Clock size={14} className="text-gray-400" /> Historique
              </h3>
            </CardHeader>
            <CardBody>
              <ol className="relative border-l border-gray-200 space-y-4 ml-2">
                {[...invoice.events].reverse().map((ev, i) => {
                  const cfg = EVENT_CONFIG[ev.type] || { label: ev.type, color: 'bg-gray-100 text-gray-500' };
                  return (
                    <li key={i} className="ml-4">
                      <span className={`absolute -left-1.5 mt-1 w-3 h-3 rounded-full border-2 border-white ${cfg.color.split(' ')[0]}`} />
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
                            {cfg.label}
                          </span>
                          {ev.note && <p className="text-xs text-gray-500 mt-0.5">{ev.note}</p>}
                        </div>
                        <time className="text-xs text-gray-400 whitespace-nowrap mt-0.5">
                          {new Date(ev.timestamp).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                        </time>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </CardBody>
          </Card>
        )}
      </div>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Modifier la facture" size="lg">
        <InvoiceForm invoice={invoice} onSuccess={() => { setEditOpen(false); mutate(); }} onCancel={() => setEditOpen(false)} />
      </Modal>

      <Modal open={emailOpen} onClose={() => setEmailOpen(false)} title="Envoyer la facture par email">
        <form onSubmit={handleSendEmail} className="space-y-4">
          <p className="text-sm text-gray-600">
            La facture <strong>{invoice.number}</strong> ({fmt(invoice.total)}) sera envoyée par email.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email destinataire</label>
            <input
              type="email"
              value={emailOverride}
              onChange={(e) => setEmailOverride(e.target.value)}
              placeholder={clientEmail || 'email@client.com'}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {clientEmail && (
              <p className="text-xs text-gray-400 mt-1">Laissez vide pour utiliser {clientEmail}</p>
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
