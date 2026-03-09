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
import { ArrowLeft, Pencil, Trash2, Send, FileText, Mail, Clock, Copy } from 'lucide-react';

const EVENT_CONFIG = {
  created:      { label: 'Créé',               color: 'bg-gray-100 text-gray-500' },
  sent:         { label: 'Envoyé par email',    color: 'bg-blue-100 text-blue-600' },
  email_opened: { label: 'Email ouvert',        color: 'bg-indigo-100 text-indigo-600' },
  viewed:       { label: 'Consulté par le client', color: 'bg-indigo-100 text-indigo-600' },
  accepted:     { label: 'Accepté',             color: 'bg-green-100 text-green-600' },
  refused:      { label: 'Refusé',              color: 'bg-red-100 text-red-600' },
  expired:      { label: 'Expiré',              color: 'bg-yellow-100 text-yellow-600' },
  reminder_sent:{ label: 'Rappel envoyé',       color: 'bg-blue-100 text-blue-500' },
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
    return <div className="flex-1 flex items-center justify-center"><div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>;
  }
  if (!quote) {
    return <div className="flex-1 flex items-center justify-center"><p className="text-gray-500">Devis introuvable.</p></div>;
  }

  const isDraft = quote.status === 'draft';
  const isWaiting = ['sent', 'email_opened', 'viewed'].includes(quote.status);
  const isFinished = ['accepted', 'refused', 'rejected', 'expired'].includes(quote.status);
  const canEdit = isDraft;
  const canDelete = ['draft', 'refused', 'rejected', 'expired'].includes(quote.status);
  const canConvert = !quote.invoiceId && (isDraft || isWaiting || quote.status === 'accepted');
  const clientEmail = quote.clientId?.email;
  const publicUrl = quote.trackingToken
    ? `${typeof window !== 'undefined' ? window.location.origin : 'https://flux-ora.vercel.app'}/q/${quote.trackingToken}`
    : null;

  return (
    <>
      <Header title={quote.number} />
      <div className="flex-1 p-6 max-w-3xl space-y-5">

        {/* Navigation + actions */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <Link href="/quotes" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800">
            <ArrowLeft size={15} /> Retour aux devis
          </Link>
          <div className="flex gap-2 flex-wrap">
            {canEdit && (
              <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}>
                <Pencil size={14} /> Modifier
              </Button>
            )}
            {!isFinished && (
              <Button size="sm" variant="secondary" onClick={() => { setEmailOverride(clientEmail || ''); setEmailOpen(true); }} loading={loading === 'email'}>
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

        {emailSent && (
          <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg">
            ✓ Devis envoyé par email avec succès. Le client recevra un lien pour accepter ou refuser.
          </div>
        )}

        {/* Bandeau En attente de réponse client */}
        {isWaiting && publicUrl && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Clock size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-blue-800 mb-1">
                  En attente de réponse du client
                </p>
                <p className="text-xs text-blue-600 mb-3">
                  {quote.status === 'viewed'
                    ? 'Le client a consulté ce devis. Sa réponse apparaîtra ici automatiquement.'
                    : quote.status === 'email_opened'
                    ? "Le client a ouvert l'email. Sa réponse apparaîtra ici automatiquement."
                    : "L'email a été envoyé. Sa réponse apparaîtra ici automatiquement."}
                </p>
                <button
                  onClick={() => navigator.clipboard.writeText(publicUrl)}
                  className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium"
                  title="Copier le lien client"
                >
                  <Copy size={12} /> Copier le lien client
                </button>
              </div>
            </div>
          </div>
        )}

        {/* En-tête devis */}
        <Card>
          <CardBody>
            <div className="flex justify-between items-start flex-wrap gap-4">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <h2 className="text-2xl font-bold font-mono text-gray-900">{quote.number}</h2>
                  <Badge status={quote.status} />
                </div>
                <p className="text-sm text-gray-500">
                  Émis le {fmtDate(quote.issueDate)}
                  {quote.expiryDate && ` · Valable jusqu'au ${fmtDate(quote.expiryDate)}`}
                </p>
                {quote.acceptedAt && <p className="text-sm text-green-600 mt-1">Accepté le {fmtDate(quote.acceptedAt)}</p>}
                {quote.invoiceId && (
                  <p className="text-sm text-indigo-600 mt-1">
                    Converti → <Link href={`/invoices/${quote.invoiceId._id}`} className="underline">Facture {quote.invoiceId.number}</Link>
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400 uppercase font-medium">Total TTC</p>
                <p className="text-3xl font-bold text-gray-900">{fmt(quote.total)}</p>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Client */}
        {quote.clientId && (
          <Card>
            <CardHeader><h3 className="text-sm font-semibold text-gray-700">Client</h3></CardHeader>
            <CardBody>
              <Link href={`/clients/${quote.clientId._id}`} className="hover:text-indigo-600">
                <p className="font-medium text-gray-900">{quote.clientId.name}</p>
                {quote.clientId.company && <p className="text-sm text-gray-500">{quote.clientId.company}</p>}
                {quote.clientId.email && <p className="text-sm text-gray-500">{quote.clientId.email}</p>}
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
                {quote.lines?.map((line, i) => (
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
                <span>Sous-total HT</span><span className="w-24 text-right">{fmt(quote.subtotal)}</span>
              </div>
              <div className="flex justify-end gap-8 text-gray-600">
                <span>TVA</span><span className="w-24 text-right">{fmt(quote.vatAmount)}</span>
              </div>
              <div className="flex justify-end gap-8 font-bold text-gray-900 text-base pt-2 border-t border-gray-200">
                <span>Total TTC</span><span className="w-24 text-right">{fmt(quote.total)}</span>
              </div>
            </div>
          </CardBody>
        </Card>

        {quote.notes && (
          <Card>
            <CardHeader><h3 className="text-sm font-semibold text-gray-700">Notes</h3></CardHeader>
            <CardBody><p className="text-sm text-gray-600 whitespace-pre-line">{quote.notes}</p></CardBody>
          </Card>
        )}

        {quote.events?.length > 0 && (
          <Card>
            <CardHeader>
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Clock size={14} className="text-gray-400" /> Historique
              </h3>
            </CardHeader>
            <CardBody>
              <ol className="relative border-l border-gray-200 space-y-4 ml-2">
                {[...quote.events].reverse().map((ev, i) => {
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

      {/* Modal edit */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Modifier le devis" size="lg">
        <QuoteForm quote={quote} onSuccess={() => { setEditOpen(false); mutate(); }} onCancel={() => setEditOpen(false)} />
      </Modal>

      {/* Modal email */}
      <Modal open={emailOpen} onClose={() => setEmailOpen(false)} title="Envoyer le devis par email">
        <form onSubmit={handleSendEmail} className="space-y-4">
          <p className="text-sm text-gray-600">
            Le devis <strong>{quote.number}</strong> sera envoyé par email au client.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email destinataire
            </label>
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
