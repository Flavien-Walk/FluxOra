'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://fluxora-ld8h.onrender.com';

const fmt = (n, currency = 'EUR') =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(n ?? 0);
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('fr-FR') : '—');

const STATUS_LABEL = {
  draft: 'Brouillon',
  sent: 'En attente',
  email_opened: 'Ouvert',
  viewed: 'Consulté',
  accepted: 'Accepté',
  refused: 'Refusé',
  expired: 'Expiré',
};

const STATUS_COLOR = {
  accepted: 'bg-green-100 text-green-700 border-green-200',
  refused: 'bg-red-100 text-red-700 border-red-200',
  expired: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  draft: 'bg-gray-100 text-gray-600 border-gray-200',
  sent: 'bg-blue-100 text-blue-700 border-blue-200',
  email_opened: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  viewed: 'bg-indigo-100 text-indigo-700 border-indigo-200',
};

export default function PublicQuotePage() {
  const { token } = useParams();
  const searchParams = useSearchParams();
  const actionParam = searchParams.get('action');

  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState('');
  const [actionDone, setActionDone] = useState('');
  const [refuseOpen, setRefuseOpen] = useState(false);
  const [refuseReason, setRefuseReason] = useState('');

  const fetchQuote = async () => {
    try {
      const res = await fetch(`${API_URL}/api/public/quotes/${token}`);
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || 'Ce devis est introuvable ou le lien a expiré.');
        return;
      }
      const data = await res.json();
      setQuote(data);
    } catch {
      setError('Impossible de charger le devis. Vérifiez votre connexion.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuote();
  }, [token]);

  // Auto-open action modal from URL param
  useEffect(() => {
    if (quote && actionParam === 'refuse' && !['accepted', 'refused', 'expired'].includes(quote.status)) {
      setRefuseOpen(true);
    } else if (quote && actionParam === 'accept' && !['accepted', 'refused', 'expired'].includes(quote.status)) {
      handleAccept();
    }
  }, [quote?.status, actionParam]);

  const handleAccept = async () => {
    setActionLoading('accept');
    try {
      const res = await fetch(`${API_URL}/api/public/quotes/${token}/accept`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setActionDone('accepted');
        setQuote((q) => ({ ...q, status: 'accepted' }));
      } else {
        alert(data.error || 'Impossible d\'accepter ce devis.');
      }
    } catch {
      alert('Erreur réseau, veuillez réessayer.');
    } finally {
      setActionLoading('');
    }
  };

  const handleRefuse = async (e) => {
    e.preventDefault();
    setActionLoading('refuse');
    try {
      const res = await fetch(`${API_URL}/api/public/quotes/${token}/refuse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: refuseReason || undefined }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionDone('refused');
        setRefuseOpen(false);
        setQuote((q) => ({ ...q, status: 'refused' }));
      } else {
        alert(data.error || 'Impossible de refuser ce devis.');
      }
    } catch {
      alert('Erreur réseau, veuillez réessayer.');
    } finally {
      setActionLoading('');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-md w-full text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-lg font-semibold text-gray-900 mb-2">Lien invalide</h1>
          <p className="text-sm text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  const org = quote.organization;
  const client = quote.client;
  const isActionable = !['accepted', 'refused', 'expired'].includes(quote.status);
  const statusClass = STATUS_COLOR[quote.status] || 'bg-gray-100 text-gray-600 border-gray-200';

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-5">

        {/* Header org */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 uppercase font-semibold tracking-wide">Document émis par</p>
            <p className="text-lg font-bold text-gray-900">{org?.name}</p>
            {org?.email && <p className="text-sm text-gray-500">{org.email}</p>}
          </div>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${statusClass}`}>
            {STATUS_LABEL[quote.status] || quote.status}
          </span>
        </div>

        {/* Bannière résultat action */}
        {(actionDone === 'accepted' || quote.status === 'accepted') && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
            <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-semibold text-green-800">Devis accepté</p>
              <p className="text-sm text-green-600">Merci ! Votre acceptation a bien été enregistrée. Nous reviendrons vers vous rapidement.</p>
            </div>
          </div>
        )}
        {(actionDone === 'refused' || quote.status === 'refused') && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-semibold text-red-800">Devis refusé</p>
              <p className="text-sm text-red-600">Votre réponse a bien été prise en compte.</p>
            </div>
          </div>
        )}
        {quote.status === 'expired' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800 font-medium">
            Ce devis a expiré le {fmtDate(quote.expiryDate)}. Contactez-nous pour un nouveau devis.
          </div>
        )}

        {/* Devis card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {/* En-tête */}
          <div className="px-6 py-5 border-b border-gray-100">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold font-mono text-gray-900">{quote.number}</h1>
                <p className="text-sm text-gray-500 mt-1">
                  Émis le {fmtDate(quote.issueDate)}
                  {quote.expiryDate && ` · Valable jusqu'au ${fmtDate(quote.expiryDate)}`}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400 uppercase font-medium">Total TTC</p>
                <p className="text-3xl font-bold text-indigo-600">{fmt(quote.total, quote.currency)}</p>
              </div>
            </div>
          </div>

          {/* Adresses */}
          <div className="grid grid-cols-2 gap-4 px-6 py-4 bg-gray-50 border-b border-gray-100 text-sm">
            <div>
              <p className="text-xs text-gray-400 uppercase font-semibold mb-1">De</p>
              <p className="font-medium text-gray-900">{org?.name}</p>
              {org?.email && <p className="text-gray-500">{org.email}</p>}
              {org?.siret && <p className="text-gray-400 text-xs">SIRET : {org.siret}</p>}
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Pour</p>
              <p className="font-medium text-gray-900">{client?.name}</p>
              {client?.company && <p className="text-gray-500">{client.company}</p>}
              {client?.email && <p className="text-gray-500">{client.email}</p>}
            </div>
          </div>

          {/* Lignes */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Prestation</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Qté</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500 uppercase">PU HT</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase">TVA</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Total HT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {quote.lines?.map((line, i) => (
                  <tr key={i}>
                    <td className="px-6 py-3 text-gray-900">{line.description}</td>
                    <td className="px-3 py-3 text-center text-gray-500">{line.quantity}</td>
                    <td className="px-3 py-3 text-right text-gray-500">{fmt(line.unitPrice, quote.currency)}</td>
                    <td className="px-3 py-3 text-center text-gray-400">{line.vatRate}%</td>
                    <td className="px-6 py-3 text-right font-medium text-gray-900">{fmt(line.quantity * line.unitPrice, quote.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totaux */}
          <div className="px-6 py-4 border-t border-gray-100 space-y-1 text-sm">
            <div className="flex justify-end gap-8 text-gray-500">
              <span>Sous-total HT</span><span className="w-28 text-right">{fmt(quote.subtotal, quote.currency)}</span>
            </div>
            <div className="flex justify-end gap-8 text-gray-500">
              <span>TVA</span><span className="w-28 text-right">{fmt(quote.vatAmount, quote.currency)}</span>
            </div>
            <div className="flex justify-end gap-8 font-bold text-gray-900 text-base pt-2 border-t border-gray-200">
              <span>Total TTC</span><span className="w-28 text-right text-indigo-600">{fmt(quote.total, quote.currency)}</span>
            </div>
          </div>

          {/* Notes */}
          {quote.notes && (
            <div className="px-6 pb-5">
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
                <p className="font-semibold text-xs uppercase text-amber-600 mb-1">Notes</p>
                {quote.notes}
              </div>
            </div>
          )}
        </div>

        {/* Boutons d'action */}
        {isActionable && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <p className="text-sm font-medium text-gray-700 mb-4 text-center">
              Que souhaitez-vous faire avec ce devis ?
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <button
                onClick={handleAccept}
                disabled={!!actionLoading}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold px-6 py-3 rounded-xl text-sm transition-colors"
              >
                {actionLoading === 'accept' ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                Accepter le devis
              </button>
              <button
                onClick={() => setRefuseOpen(true)}
                disabled={!!actionLoading}
                className="flex items-center gap-2 bg-white hover:bg-gray-50 disabled:opacity-60 text-gray-700 font-semibold px-6 py-3 rounded-xl text-sm border border-gray-300 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Refuser
              </button>
            </div>
          </div>
        )}

        {/* Contact */}
        <p className="text-center text-xs text-gray-400">
          Une question ? Contactez {org?.name} à{' '}
          <a href={`mailto:${org?.email}`} className="text-indigo-500 hover:underline">{org?.email}</a>
        </p>

        <p className="text-center text-xs text-gray-300">Propulsé par Fluxora</p>
      </div>

      {/* Modal refus */}
      {refuseOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Refuser le devis</h2>
            <p className="text-sm text-gray-500 mb-4">
              Vous pouvez indiquer une raison (optionnel). Elle sera transmise à {org?.name}.
            </p>
            <form onSubmit={handleRefuse} className="space-y-4">
              <textarea
                rows={3}
                value={refuseReason}
                onChange={(e) => setRefuseReason(e.target.value)}
                placeholder="Raison du refus (optionnel)..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
              />
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setRefuseOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === 'refuse'}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg disabled:opacity-60"
                >
                  {actionLoading === 'refuse' && (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  Confirmer le refus
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
