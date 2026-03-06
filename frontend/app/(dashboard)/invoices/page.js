'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useInvoices } from '@/hooks/useInvoices';
import Header from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import InvoiceForm from '@/components/modules/InvoiceForm';
import { FilePlus, FileText, ChevronRight } from 'lucide-react';

const FILTERS = [
  { label: 'Toutes', value: '' },
  { label: 'Brouillon', value: 'draft' },
  { label: 'Envoyées', value: 'sent' },
  { label: 'Payées', value: 'paid' },
  { label: 'En retard', value: 'late' },
];

const fmt = (n) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('fr-FR') : '—';

export default function InvoicesPage() {
  const [filter, setFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const { invoices, isLoading, mutate } = useInvoices(filter);

  const handleCreated = () => {
    setModalOpen(false);
    mutate();
  };

  return (
    <>
      <Header title="Factures" />
      <div className="flex-1 p-6">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center mb-5">
          {/* Filtres statut */}
          <div className="flex gap-1 flex-wrap">
            {FILTERS.map(({ label, value }) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filter === value
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <Button onClick={() => setModalOpen(true)}>
            <FilePlus size={16} />
            Nouvelle facture
          </Button>
        </div>

        {/* Liste */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : invoices.length === 0 ? (
          <Card>
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileText size={40} className="text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">Aucune facture</p>
              <p className="text-gray-400 text-sm mt-1">
                {filter ? 'Aucune facture avec ce statut' : 'Créez votre première facture'}
              </p>
            </div>
          </Card>
        ) : (
          <Card>
            {/* En-tête */}
            <div className="hidden sm:grid grid-cols-12 gap-4 px-6 py-3 border-b border-gray-100 text-xs font-medium text-gray-500 uppercase">
              <span className="col-span-2">Numéro</span>
              <span className="col-span-3">Client</span>
              <span className="col-span-2">Statut</span>
              <span className="col-span-2">Échéance</span>
              <span className="col-span-2 text-right">Montant TTC</span>
              <span className="col-span-1" />
            </div>
            <div className="divide-y divide-gray-100">
              {invoices.map((inv) => (
                <Link
                  key={inv._id}
                  href={`/invoices/${inv._id}`}
                  className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-gray-50 transition-colors group"
                >
                  <span className="col-span-2 text-sm font-mono font-medium text-gray-900">
                    {inv.number}
                  </span>
                  <span className="col-span-3 text-sm text-gray-700">
                    {inv.clientId?.name || '—'}
                    {inv.clientId?.company && (
                      <span className="block text-xs text-gray-400">{inv.clientId.company}</span>
                    )}
                  </span>
                  <span className="col-span-2">
                    <Badge status={inv.status} />
                  </span>
                  <span className="col-span-2 text-sm text-gray-500">
                    {fmtDate(inv.dueDate)}
                  </span>
                  <span className="col-span-2 text-sm font-semibold text-gray-900 text-right">
                    {fmt(inv.total)}
                  </span>
                  <span className="col-span-1 flex justify-end">
                    <ChevronRight size={16} className="text-gray-400 group-hover:text-gray-600" />
                  </span>
                </Link>
              ))}
            </div>
          </Card>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nouvelle facture" size="lg">
        <InvoiceForm onSuccess={handleCreated} onCancel={() => setModalOpen(false)} />
      </Modal>
    </>
  );
}
