'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuote } from '@/hooks/useQuotes';
import api from '@/lib/api';
import Header from '@/components/layout/Header';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import QuoteForm from '@/components/modules/QuoteForm';
import { cn } from '@/lib/utils';
import {
  ArrowLeft, Pencil, Trash2, Send, FileText, Mail,
  Clock, Copy, CheckCircle2, XCircle, AlertCircle,
  Eye, BellRing,
} from 'lucide-react';

const EVENT_CONFIG = {
  created:       { label: 'Créé',                  color: 'bg-slate-100 text-slate-500',    dot: 'bg-slate-400' },
  sent:          { label: 'Envoyé par email',       color: 'bg-accent-50 text-accent-600',   dot: 'bg-accent-500' },
  email_opened:  { label: 'Email ouvert',           color: 'bg-accent-50 text-accent-600',   dot: 'bg-accent-400' },
  viewed:        { label: 'Consulté par le client', color: 'bg-purple-50 text-purple-600',   dot: 'bg-purple-400' },
  accepted:      { label: 'Accepté',                color: 'bg-success-50 text-success-700', dot: 'bg-success-500' },
  refused:       { label: 'Refusé',                 color: 'bg-danger-50 text-danger-600',   dot: 'bg-danger-500' },
  expired:       { label: 'Expiré',                 color: 'bg-warning-50 text-warning-700', dot: 'bg-warning-500' },
  reminder_sent: { label: 'Rappel envoyé',          color: 'bg-accent-50 text-accent-500',   dot: 'bg-accent-300' },
};

const fmt = (n) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n ?? 0);
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('fr-FR') : '—');

export default function QuoteDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { quote, isLoading, mutate } = useQuote(id);
  const [editOpen, setEditOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [loading, setLoading] = useState('');
  const [emailOverride, setEmailOverride] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  const updateStatus = async (status) => {
    setLoading(status);
    try {
      await api.put(`/api/quotes/${id}`, { status });
      mutate();
    } finally {
      setLoading('');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Supprimer ce devis ?')) return;
    setLoading('delete');
    try {
      await api.delete(`/api/quotes/${id}`);
      router.push('/quotes');
    } finally {
      setLoading('');
    }
  };

  const handleSendEmail = async (e) => {
    e.preventDefault();
    setLoading('email');
    try {
      await api.post(`/api/quotes/${id}/send-email`, {
        overrideEmail: emailOverride || undefined,
      });
      setEmailSent(true);
      setEmailOpen(false);
      mutate();
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur lors de l\'envoi.');
    } finally {
      setLoading('');
    }
  };

  const handleConvert = async () => {
    if (!confirm('Convertir ce devis en facture ?')) return;
    setLoading('convert');
    try {
      const { data } = await api.post(`/api/quotes/${id}/convert`);
      router.push(`/invoices/${data.invoice._id}`);
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur lors de la conversion.');
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
  if (!quote) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-slate-500">Devis introuvable.</p>
      </div>
    );
  }

  const isDraft    = quote.status === 'draft';
  const isWaiting  = ['sent', 'email_opened', 'viewed'].includes(quote.status);
  const isFinished = ['accepted', 'refused', 'rejected', 'expired'].includes(quote.status);
  const canEdit    = isDraft;
  const canDelete  = ['draft', 'refused', 'rejected', 'expired'].includes(quote.status);
  const canConvert = !quote.invoiceId && (isDraft || isWaiting || quote.status === 'accepted');
  const clientEmail = quote.clientId?.email;
  const publicUrl  = quote.trackingToken
    ? `${typeof window !== 'undefined' ? window.location.origin : 'https://flux-ora.vercel.app'}/q/${quote.trackingToken}`
    : null;

  return (
    <>
      <Header title={quote.number} />
      <div className="flex-1 p-6 max-w-3xl space-y-5">

        {/* Navigation + actions */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <Link
            href="/quotes"
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft size={15} /> Retour aux devis
          </Link>
          <div className="flex gap-2 flex-wrap">
            {canEdit && (
              <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}>
                <Pencil size={14} /> Modifier
              </Button>
            )}
            {!isFinished && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => { setEmailOverride(clientEmail || ''); setEmailOpen(true); }}
                loading={loading === 'email'}
              >
                <Mail size={14} /> {isWaiting ? 'Renvoyer' : 'Envoyer par email'}
              </Button>
            )}
            {canConvert && (
              <Button size="sm" onClick={handleConvert} loading={loading === 'convert'}>
                <FileText size={14} /> Convertir en facture
              </Button>
            )}
            {canDelete && (
              <Button variant="danger" size="sm" onClick={handleDelete} loading={loading === 'delete'}>
                <Trash2 size={14} /> Supprimer
              </Button>
            )}
          </div>
        </div>

        {/* Succès email */}
        {emailSent && (
          <div className="bg-success-50 border border-success-200 text-success-700 text-sm px-4 py-3 rounded-lg flex items-center gap-2">
            <CheckCircle2 size={15} className="text-success-500 flex-shrink-0" />
            Devis envoyé par email avec succès. Le client recevra un lien pour accepter ou refuser.
          </div>
        )}

        {/* Bannière devis accepté → convertir */}
        {quote.status === 'accepted' && !quote.invoiceId && (
          <div className="bg-success-50 border-2 border-success-300 rounded-xl p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-success-100 rounded-full flex items-center justify-center flex-shrink-0">
                <CheckCircle2 size={18} className="text-success-600" />
              </div>
              <div>
                <p className="font-semibold text-success-800">Devis accepté par le client !</p>
                <p className="text-sm text-success-600">Convertissez-le en facture pour déclencher le paiement.</p>
              </div>
            </div>
            <Button onClick={handleConvert} loading={loading === 'convert'} className="flex-shrink-0">
              <FileText size={14} /> Créer la facture
            </Button>
          </div>
        )}

        {/* Lien vers la facture si déjà converti */}
        {quote.invoiceId && (
          <div className="bg-accent-50 border border-accent-200 rounded-xl p-4 flex items-center justify-between">
            <p className="text-sm text-accent-700 font-medium">Ce devis a été converti en facture.</p>
            <Link
              href={`/invoices/${quote.invoiceId._id || quote.invoiceId}`}
              className="text-sm font-semibold text-accent-600 hover:underline flex items-center gap-1"
            >
              Voir la facture <FileText size={14} />
            </Link>
          </div>
        )}

        {/* Bandeau en attente */}
        {isWaiting && publicUrl && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-accent-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                {quote.status === 'viewed'
                  ? <Eye size={15} className="text-accent-500" />
                  : quote.status === 'email_opened'
                  ? <BellRing size={15} className="text-accent-500" />
                  : <Clock size={15} className="text-slate-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 mb-0.5">
                  En attente de réponse du client
                </p>
                <p className="text-xs text-slate-500 mb-3">
                  {quote.status === 'viewed'
                    ? 'Le client a consulté ce devis. Sa réponse apparaîtra ici automatiquement.'
                    : quote.status === 'email_opened'
                    ? "Le client a ouvert l'email. Sa réponse apparaîtra ici automatiquement."
                    : "L'email a été envoyé. Sa réponse apparaîtra ici automatiquement."}
                </p>
                <button
                  onClick={() => navigator.clipboard.writeText(publicUrl)}
                  className="inline-flex items-center gap-1.5 text-xs text-accent-600 hover:text-accent-800 font-medium transition-colors"
                >
                  <Copy size={12} /> Copier le lien client
                </button>
              </div>
            </div>
          </div>
        )}

        {/* En-tête devis */}
        <Card>
          <div className="h-[3px] bg-accent-500 rounded-t-xl" />
          <CardBody>
            <div className="flex justify-between items-start flex-wrap gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-2xl font-bold font-mono text-slate-900">{quote.number}</h2>
                  <Badge status={quote.status} />
                </div>
                <p className="text-sm text-slate-500">
                  Émis le {fmtDate(quote.issueDate)}
                  {quote.expiryDate && ` · Valable jusqu'au ${fmtDate(quote.expiryDate)}`}
                </p>
                {quote.acceptedAt && (
                  <p className="text-sm text-success-600 mt-1">Accepté le {fmtDate(quote.acceptedAt)}</p>
                )}
                {quote.invoiceId && (
                  <p className="text-sm text-accent-600 mt-1">
                    Converti →{' '}
                    <Link href={`/invoices/${quote.invoiceId._id}`} className="underline">
                      Facture {quote.invoiceId.number}
                    </Link>
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-widest mb-1">Total TTC</p>
                <p className="text-3xl font-bold text-slate-900 tabular-nums">{fmt(quote.total)}</p>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Client */}
        {quote.clientId && (
          <Card>
            <CardHeader>
              <h3 className="text-sm font-semibold text-slate-700">Client</h3>
            </CardHeader>
            <CardBody>
              <Link
                href={`/clients/${quote.clientId._id}`}
                className="flex items-center gap-3 group"
              >
                <div className="w-9 h-9 bg-accent-50 text-accent-600 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                  {quote.clientId.name?.charAt(0).toUpperCase()}
                </div>
                <div className="group-hover:text-accent-600 transition-colors">
                  <p className="font-medium text-slate-900 group-hover:text-accent-600">{quote.clientId.name}</p>
                  {quote.clientId.company && (
                    <p className="text-sm text-slate-500">{quote.clientId.company}</p>
                  )}
                  {quote.clientId.email && (
                    <p className="text-sm text-slate-400">{quote.clientId.email}</p>
                  )}
                </div>
              </Link>
            </CardBody>
          </Card>
        )}

        {/* Lignes */}
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-slate-700">Prestations</h3>
          </CardHeader>
          <CardBody className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-6 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Description</th>
                  <th className="text-center px-3 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Qté</th>
                  <th className="text-right px-3 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">PU HT</th>
                  <th className="text-center px-3 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">TVA</th>
                  <th className="text-right px-6 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total HT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {quote.lines?.map((line, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-3 text-slate-900">{line.description}</td>
                    <td className="px-3 py-3 text-center text-slate-600 tabular-nums">{line.quantity}</td>
                    <td className="px-3 py-3 text-right text-slate-600 tabular-nums">{fmt(line.unitPrice)}</td>
                    <td className="px-3 py-3 text-center text-slate-500">{line.vatRate}%</td>
                    <td className="px-6 py-3 text-right font-medium tabular-nums">{fmt(line.quantity * line.unitPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-6 py-4 border-t border-slate-100 space-y-1.5 text-sm bg-slate-50/50">
              <div className="flex justify-end gap-8 text-slate-500">
                <span>Sous-total HT</span>
                <span className="w-28 text-right tabular-nums">{fmt(quote.subtotal)}</span>
              </div>
              <div className="flex justify-end gap-8 text-slate-500">
                <span>TVA</span>
                <span className="w-28 text-right tabular-nums">{fmt(quote.vatAmount)}</span>
              </div>
              <div className="flex justify-end gap-8 font-bold text-slate-900 text-base pt-2 border-t border-slate-200">
                <span>Total TTC</span>
                <span className="w-28 text-right tabular-nums">{fmt(quote.total)}</span>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Notes */}
        {quote.notes && (
          <Card>
            <CardHeader>
              <h3 className="text-sm font-semibold text-slate-700">Notes</h3>
            </CardHeader>
            <CardBody>
              <p className="text-sm text-slate-600 whitespace-pre-line">{quote.notes}</p>
            </CardBody>
          </Card>
        )}

        {/* Historique événements */}
        {quote.events?.length > 0 && (
          <Card>
            <CardHeader>
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Clock size={14} className="text-slate-400" /> Historique
              </h3>
            </CardHeader>
            <CardBody>
              <ol className="space-y-0">
                {[...quote.events].reverse().map((ev, i, arr) => {
                  const isLast = i === arr.length - 1;
                  const cfg = EVENT_CONFIG[ev.type] || {
                    label: ev.type,
                    color: 'bg-slate-100 text-slate-500',
                    dot: 'bg-slate-400',
                  };
                  return (
                    <li key={i} className="flex gap-4 relative">
                      {/* Dot + connector */}
                      <div className="relative flex flex-col items-center">
                        <span className={cn(
                          'w-6 h-6 rounded-full flex-shrink-0 z-10 border-2 border-white shadow-sm',
                          cfg.dot
                        )} />
                        {!isLast && (
                          <div className="absolute left-[11px] top-7 bottom-0 w-px bg-slate-100" />
                        )}
                      </div>
                      {/* Content */}
                      <div className={cn('flex-1 flex items-start justify-between gap-3 pb-4', isLast && 'pb-0')}>
                        <div>
                          <span className={cn(
                            'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                            cfg.color
                          )}>
                            {cfg.label}
                          </span>
                          {ev.note && <p className="text-xs text-slate-500 mt-0.5">{ev.note}</p>}
                        </div>
                        <time className="text-xs text-slate-400 whitespace-nowrap mt-0.5">
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

      {/* Modal edit */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Modifier le devis" size="lg">
        <QuoteForm
          quote={quote}
          onSuccess={() => { setEditOpen(false); mutate(); }}
          onCancel={() => setEditOpen(false)}
        />
      </Modal>

      {/* Modal email */}
      <Modal open={emailOpen} onClose={() => setEmailOpen(false)} title="Envoyer le devis par email">
        <form onSubmit={handleSendEmail} className="space-y-4">
          <p className="text-sm text-slate-600">
            Le devis <strong className="text-slate-800">{quote.number}</strong> sera envoyé par email au client.
          </p>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Email destinataire
            </label>
            <input
              type="email"
              value={emailOverride}
              onChange={(e) => setEmailOverride(e.target.value)}
              placeholder={clientEmail || 'email@client.com'}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
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
