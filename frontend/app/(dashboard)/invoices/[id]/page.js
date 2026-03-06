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
import { ArrowLeft, Pencil, Trash2, Send, CreditCard } from 'lucide-react';

const fmt = (n) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n ?? 0);

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('fr-FR') : '—';

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { invoice, isLoading, mutate } = useInvoice(id);
  const [editOpen, setEditOpen] = useState(false);
  const [loading, setLoading] = useState('');

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
                {invoice.paidAt && (
                  <p className="text-sm text-green-600 mt-1">Payée le {fmtDate(invoice.paidAt)}</p>
                )}
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
                {invoice.clientId.company && (
                  <p className="text-sm text-gray-500">{invoice.clientId.company}</p>
                )}
                {invoice.clientId.email && (
                  <p className="text-sm text-gray-500">{invoice.clientId.email}</p>
                )}
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
            {/* Totaux */}
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

        {invoice.notes && (
          <Card>
            <CardHeader><h3 className="text-sm font-semibold text-gray-700">Notes</h3></CardHeader>
            <CardBody><p className="text-sm text-gray-600 whitespace-pre-line">{invoice.notes}</p></CardBody>
          </Card>
        )}
      </div>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Modifier la facture" size="lg">
        <InvoiceForm
          invoice={invoice}
          onSuccess={() => { setEditOpen(false); mutate(); }}
          onCancel={() => setEditOpen(false)}
        />
      </Modal>
    </>
  );
}
