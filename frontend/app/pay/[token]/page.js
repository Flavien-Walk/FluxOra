'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://fluxora-ld8h.onrender.com';

const fmt = (n, currency = 'EUR') =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(n ?? 0);
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('fr-FR') : '—');

const PAYMENT_METHODS = [
  { id: 'card', label: 'Carte bancaire', icon: '💳', desc: 'Visa, Mastercard, CB' },
  { id: 'transfer', label: 'Virement bancaire', icon: '🏦', desc: 'Délai 1-2 jours ouvrés' },
  { id: 'sepa', label: 'Prélèvement SEPA', icon: '🇪🇺', desc: 'Mandat SEPA' },
  { id: 'apple_pay', label: 'Apple Pay', icon: '', desc: 'Touch/Face ID' },
  { id: 'google_pay', label: 'Google Pay', icon: 'G', desc: 'Pay with Google' },
];

export default function PayInvoicePage() {
  const { token } = useParams();

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [method, setMethod] = useState('card');
  const [payLoading, setPayLoading] = useState(false);
  const [step, setStep] = useState('choose'); // choose | processing | success

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const res = await fetch(`${API_URL}/api/public/invoices/${token}`);
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          setError(d.error || 'Facture introuvable ou lien expiré.');
          return;
        }
        const data = await res.json();
        setInvoice(data);
        // Si déjà payée, montrer la page de succès
        if (data.status === 'paid') setStep('success');
      } catch {
        setError('Impossible de charger la facture. Vérifiez votre connexion.');
      } finally {
        setLoading(false);
      }
    };
    fetchInvoice();
  }, [token]);

  const handlePay = async (e) => {
    e.preventDefault();
    setPayLoading(true);
    setStep('processing');
    try {
      const res = await fetch(`${API_URL}/api/public/invoices/${token}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method }),
      });
      const data = await res.json();
      if (res.ok) {
        // Attendre ~2s pour montrer l'animation de traitement, puis succès
        setTimeout(() => {
          setStep('success');
          setInvoice((inv) => ({ ...inv, status: 'paid', paidAt: new Date().toISOString() }));
        }, 2000);
      } else {
        setStep('choose');
        alert(data.error || 'Erreur lors du paiement.');
      }
    } catch {
      setStep('choose');
      alert('Erreur réseau, veuillez réessayer.');
    } finally {
      setPayLoading(false);
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

  const org = invoice.organization;
  const client = invoice.client;

  // ─── Étape : Traitement en cours ────────────────────────────────────────────
  if (step === 'processing') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-6" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Paiement en cours...</h2>
          <p className="text-sm text-gray-500">
            Traitement de votre paiement de <strong>{fmt(invoice.total, invoice.currency)}</strong>.
            <br />Merci de ne pas fermer cette page.
          </p>
        </div>
      </div>
    );
  }

  // ─── Étape : Succès ─────────────────────────────────────────────────────────
  if (step === 'success') {
    const selectedMethod = PAYMENT_METHODS.find((m) => m.id === method) || PAYMENT_METHODS[0];
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Paiement effectué !</h1>
          <p className="text-gray-500 text-sm mb-6">
            Votre paiement de <strong className="text-gray-900">{fmt(invoice.total, invoice.currency)}</strong> a bien été reçu par{' '}
            <strong className="text-gray-900">{org?.name}</strong>.
          </p>

          <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-2 text-left mb-6">
            <div className="flex justify-between">
              <span className="text-gray-500">Facture</span>
              <span className="font-mono font-semibold text-gray-900">{invoice.number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Montant</span>
              <span className="font-semibold text-gray-900">{fmt(invoice.total, invoice.currency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Moyen de paiement</span>
              <span className="text-gray-900">{selectedMethod.label}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Date</span>
              <span className="text-gray-900">{fmtDate(invoice.paidAt || new Date())}</span>
            </div>
          </div>

          <p className="text-xs text-gray-400">
            Un reçu vous sera envoyé à l&apos;adresse email fournie lors de la transaction.
          </p>
        </div>
      </div>
    );
  }

  // ─── Étape : Choix du paiement ────────────────────────────────────────────
  if (invoice.status === 'cancelled') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-md w-full text-center">
          <p className="text-gray-600 font-medium">Cette facture a été annulée.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-lg mx-auto space-y-5">

        {/* Header */}
        <div className="text-center">
          <p className="text-sm text-gray-400 mb-1">Paiement sécurisé — {org?.name}</p>
          <p className="text-4xl font-bold text-gray-900">{fmt(invoice.total, invoice.currency)}</p>
          <p className="text-sm text-gray-500 mt-1">Facture {invoice.number}</p>
          {invoice.dueDate && (
            <p className="text-xs text-gray-400 mt-1">Échéance : {fmtDate(invoice.dueDate)}</p>
          )}
        </div>

        {/* Résumé facture */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex justify-between text-xs font-semibold text-gray-500 uppercase">
            <span>Prestation</span><span>Montant</span>
          </div>
          {invoice.lines?.map((line, i) => (
            <div key={i} className="px-5 py-3 flex justify-between text-sm border-b border-gray-50 last:border-0">
              <span className="text-gray-700">{line.description} {line.quantity > 1 && <span className="text-gray-400">×{line.quantity}</span>}</span>
              <span className="font-medium text-gray-900">{fmt(line.quantity * line.unitPrice, invoice.currency)}</span>
            </div>
          ))}
          <div className="px-5 py-3 bg-indigo-50 border-t border-indigo-100 flex justify-between text-sm font-bold text-indigo-900">
            <span>Total TTC</span>
            <span>{fmt(invoice.total, invoice.currency)}</span>
          </div>
        </div>

        {/* Choix méthode */}
        <form onSubmit={handlePay} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">Choisir un mode de paiement</h2>
          <div className="space-y-2">
            {PAYMENT_METHODS.map((m) => (
              <label
                key={m.id}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                  method === m.id
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="method"
                  value={m.id}
                  checked={method === m.id}
                  onChange={() => setMethod(m.id)}
                  className="sr-only"
                />
                <span className="text-xl w-8 text-center">{m.icon}</span>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${method === m.id ? 'text-indigo-700' : 'text-gray-900'}`}>
                    {m.label}
                  </p>
                  <p className="text-xs text-gray-400">{m.desc}</p>
                </div>
                {method === m.id && (
                  <svg className="w-4 h-4 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </label>
            ))}
          </div>

          <button
            type="submit"
            disabled={payLoading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold py-4 rounded-xl text-base transition-colors flex items-center justify-center gap-2"
          >
            {payLoading ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Payer {fmt(invoice.total, invoice.currency)}
              </>
            )}
          </button>

          <p className="text-center text-xs text-gray-400">
            Paiement sécurisé · Vos données sont protégées
          </p>
        </form>

        {/* Info destinataire */}
        <div className="text-center text-xs text-gray-400 space-y-1">
          <p>Paiement destiné à <strong className="text-gray-600">{org?.name}</strong></p>
          {org?.email && <p>{org.email}</p>}
          {org?.siret && <p>SIRET : {org.siret}</p>}
        </div>

        <p className="text-center text-xs text-gray-300">Propulsé par Fluxora</p>
      </div>
    </div>
  );
}
