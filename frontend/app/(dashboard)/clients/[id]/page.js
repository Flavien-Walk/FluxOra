'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import useSWR from 'swr';
import { useClient } from '@/hooks/useClients';
import api from '@/lib/api';
import Header from '@/components/layout/Header';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import ClientForm from '@/components/modules/ClientForm';
import Badge from '@/components/ui/Badge';
import {
  ArrowLeft, Pencil, Trash2, Mail, Phone,
  MapPin, Building, FileText, ClipboardList,
  TrendingUp, Clock, ChevronRight, Plus,
} from 'lucide-react';

const fetcher = (url) => api.get(url).then((r) => r.data);

const fmt = (n) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n ?? 0);
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('fr-FR') : '—');

const QUOTE_STATUS = {
  draft:    { label: 'Brouillon', color: 'bg-gray-100 text-gray-500' },
  sent:     { label: 'Envoyé',    color: 'bg-blue-100 text-blue-700' },
  accepted: { label: 'Accepté',   color: 'bg-green-100 text-green-700' },
  rejected: { label: 'Refusé',    color: 'bg-red-100 text-red-700' },
  expired:  { label: 'Expiré',    color: 'bg-orange-100 text-orange-700' },
};

export default function ClientDetailPage() {
  const { id } = useParams();
  const router  = useRouter();
  const { client, isLoading, mutate } = useClient(id);
  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { data: invData } = useSWR(
    id ? `/api/invoices?clientId=${id}&limit=10` : null,
    fetcher,
    { revalidateOnFocus: false }
  );
  const { data: qData } = useSWR(
    id ? `/api/quotes?clientId=${id}&limit=10` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const invoices = invData?.invoices || [];
  const quotes   = qData?.quotes    || [];

  // KPIs client
  const totalCA      = invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.total, 0);
  const totalPending = invoices.filter((i) => ['sent', 'late'].includes(i.status)).reduce((s, i) => s + i.total, 0);
  const lateCount    = invoices.filter((i) => i.status === 'late').length;

  const handleDelete = async () => {
    if (!confirm(`Supprimer le client "${client.name}" ? Cette action est irréversible.`)) return;
    setDeleting(true);
    try {
      await api.delete(`/api/clients/${id}`);
      router.push('/clients');
    } catch {
      setDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-500">Client introuvable.</p>
      </div>
    );
  }

  return (
    <>
      <Header title={client.name} />
      <div className="flex-1 p-6 max-w-3xl space-y-5">

        {/* Retour + actions */}
        <div className="flex items-center justify-between">
          <Link href="/clients" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800">
            <ArrowLeft size={15} /> Retour aux clients
          </Link>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil size={14} /> Modifier
            </Button>
            <Button variant="danger" size="sm" onClick={handleDelete} loading={deleting}>
              <Trash2 size={14} /> Supprimer
            </Button>
          </div>
        </div>

        {/* KPIs client */}
        {invoices.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-green-50 border border-green-100 rounded-xl p-4">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingUp size={13} className="text-green-600" />
                <span className="text-xs font-medium text-green-700 uppercase">CA encaissé</span>
              </div>
              <p className="text-xl font-bold text-green-700">{fmt(totalCA)}</p>
            </div>
            <div className={`border rounded-xl p-4 ${totalPending > 0 ? 'bg-yellow-50 border-yellow-100' : 'bg-white border-gray-200'}`}>
              <div className="flex items-center gap-1.5 mb-1">
                <Clock size={13} className={totalPending > 0 ? 'text-yellow-600' : 'text-gray-400'} />
                <span className={`text-xs font-medium uppercase ${totalPending > 0 ? 'text-yellow-700' : 'text-gray-500'}`}>En attente</span>
              </div>
              <p className={`text-xl font-bold ${totalPending > 0 ? 'text-yellow-700' : 'text-gray-400'}`}>{fmt(totalPending)}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-1.5 mb-1">
                <FileText size={13} className="text-gray-400" />
                <span className="text-xs font-medium text-gray-500 uppercase">Factures</span>
              </div>
              <p className="text-xl font-bold text-gray-800">
                {invoices.length}
                {lateCount > 0 && (
                  <span className="text-sm font-medium text-red-500 ml-2">({lateCount} en retard)</span>
                )}
              </p>
            </div>
          </div>
        )}

        {/* Infos client */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xl font-bold">
                {client.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">{client.name}</h2>
                {client.company && (
                  <p className="text-sm text-gray-500 flex items-center gap-1">
                    <Building size={13} /> {client.company}
                  </p>
                )}
              </div>
            </div>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              {client.email && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Mail size={14} className="text-gray-400" />
                  <a href={`mailto:${client.email}`} className="hover:text-indigo-600">{client.email}</a>
                </div>
              )}
              {client.phone && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Phone size={14} className="text-gray-400" />
                  {client.phone}
                </div>
              )}
              {(client.address || client.city) && (
                <div className="flex items-center gap-2 text-gray-600 sm:col-span-2">
                  <MapPin size={14} className="text-gray-400" />
                  {[client.address, client.city, client.country].filter(Boolean).join(', ')}
                </div>
              )}
              {client.vatNumber && (
                <div className="text-gray-600">
                  <span className="text-gray-400 text-xs uppercase font-medium">N° TVA</span>
                  <p>{client.vatNumber}</p>
                </div>
              )}
            </div>
            {client.notes && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs uppercase font-medium text-gray-400 mb-1">Notes</p>
                <p className="text-sm text-gray-600 whitespace-pre-line">{client.notes}</p>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Factures du client */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText size={15} className="text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-700">Factures</h3>
                {invoices.length > 0 && (
                  <span className="text-xs text-gray-400">({invoices.length})</span>
                )}
              </div>
              <Link
                href={`/invoices/new?clientId=${id}`}
                className="flex items-center gap-1 text-xs text-indigo-600 hover:underline"
              >
                <Plus size={12} /> Nouvelle facture
              </Link>
            </div>
          </CardHeader>
          <CardBody className="p-0">
            {invoices.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-gray-400">Aucune facture pour ce client</p>
                <Link href={`/invoices`} className="text-xs text-indigo-600 hover:underline mt-1 inline-block">
                  Créer une facture →
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {invoices.map((inv) => (
                  <Link
                    key={inv._id}
                    href={`/invoices/${inv._id}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">{inv.number}</p>
                      <p className="text-xs text-gray-400">
                        {fmtDate(inv.issueDate)}
                        {inv.dueDate && ` · Échéance ${fmtDate(inv.dueDate)}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge status={inv.status} />
                      <span className="text-sm font-semibold text-gray-800">{fmt(inv.total)}</span>
                      <ChevronRight size={14} className="text-gray-300" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Devis du client */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardList size={15} className="text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-700">Devis</h3>
                {quotes.length > 0 && (
                  <span className="text-xs text-gray-400">({quotes.length})</span>
                )}
              </div>
            </div>
          </CardHeader>
          <CardBody className="p-0">
            {quotes.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-gray-400">Aucun devis pour ce client</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {quotes.map((q) => {
                  const st = QUOTE_STATUS[q.status] || QUOTE_STATUS.draft;
                  return (
                    <Link
                      key={q._id}
                      href={`/quotes/${q._id}`}
                      className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">{q.number}</p>
                        <p className="text-xs text-gray-400">
                          {fmtDate(q.issueDate)}
                          {q.expiryDate && ` · Expire ${fmtDate(q.expiryDate)}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.color}`}>{st.label}</span>
                        <span className="text-sm font-semibold text-gray-800">{fmt(q.total)}</span>
                        <ChevronRight size={14} className="text-gray-300" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardBody>
        </Card>

      </div>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Modifier le client" size="lg">
        <ClientForm
          client={client}
          onSuccess={() => { setEditOpen(false); mutate(); }}
          onCancel={() => setEditOpen(false)}
        />
      </Modal>
    </>
  );
}
