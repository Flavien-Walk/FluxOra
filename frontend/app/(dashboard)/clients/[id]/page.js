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
  AlertCircle,
} from 'lucide-react';

const fetcher = (url) => api.get(url).then((r) => r.data);

const fmt = (n) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n ?? 0);
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('fr-FR') : '—');

const QUOTE_STATUS = {
  draft:    { label: 'Brouillon', color: 'bg-slate-100 text-slate-500' },
  sent:     { label: 'Envoyé',    color: 'bg-accent-50 text-accent-700' },
  accepted: { label: 'Accepté',   color: 'bg-success-50 text-success-700' },
  rejected: { label: 'Refusé',    color: 'bg-danger-50 text-danger-700' },
  expired:  { label: 'Expiré',    color: 'bg-warning-50 text-warning-700' },
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
        <div className="w-6 h-6 border-2 border-accent-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-slate-500">Client introuvable.</p>
      </div>
    );
  }

  return (
    <>
      <Header title={client.name} />
      <div className="flex-1 p-6 max-w-3xl space-y-5">

        {/* Retour + actions */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <Link
            href="/clients"
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
          >
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
            {/* CA encaissé */}
            <div className="bg-white rounded-xl border border-[rgba(148,163,184,0.3)] shadow-card overflow-hidden">
              <div className="h-[3px] bg-success-500" />
              <div className="p-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <TrendingUp size={13} className="text-success-600" />
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">CA encaissé</span>
                </div>
                <p className="text-xl font-bold text-slate-900 tabular-nums">{fmt(totalCA)}</p>
              </div>
            </div>

            {/* En attente */}
            <div className="bg-white rounded-xl border border-[rgba(148,163,184,0.3)] shadow-card overflow-hidden">
              <div className={`h-[3px] ${totalPending > 0 ? 'bg-warning-500' : 'bg-slate-200'}`} />
              <div className="p-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <Clock size={13} className={totalPending > 0 ? 'text-warning-600' : 'text-slate-400'} />
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">En attente</span>
                </div>
                <p className={`text-xl font-bold tabular-nums ${totalPending > 0 ? 'text-warning-700' : 'text-slate-400'}`}>
                  {fmt(totalPending)}
                </p>
              </div>
            </div>

            {/* Factures */}
            <div className="bg-white rounded-xl border border-[rgba(148,163,184,0.3)] shadow-card overflow-hidden">
              <div className={`h-[3px] ${lateCount > 0 ? 'bg-danger-500' : 'bg-slate-200'}`} />
              <div className="p-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <FileText size={13} className={lateCount > 0 ? 'text-danger-500' : 'text-slate-400'} />
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Factures</span>
                </div>
                <p className="text-xl font-bold text-slate-900 tabular-nums">
                  {invoices.length}
                  {lateCount > 0 && (
                    <span className="text-sm font-medium text-danger-500 ml-2">({lateCount} en retard)</span>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Infos client */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-accent-50 text-accent-600 rounded-full flex items-center justify-center text-xl font-bold flex-shrink-0">
                {client.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">{client.name}</h2>
                {client.company && (
                  <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-0.5">
                    <Building size={13} className="text-slate-400" /> {client.company}
                  </p>
                )}
              </div>
            </div>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              {client.email && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Mail size={14} className="text-slate-400 flex-shrink-0" />
                  <a
                    href={`mailto:${client.email}`}
                    className="hover:text-accent-600 transition-colors truncate"
                  >
                    {client.email}
                  </a>
                </div>
              )}
              {client.phone && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Phone size={14} className="text-slate-400 flex-shrink-0" />
                  {client.phone}
                </div>
              )}
              {(client.address || client.city) && (
                <div className="flex items-center gap-2 text-slate-600 sm:col-span-2">
                  <MapPin size={14} className="text-slate-400 flex-shrink-0" />
                  {[client.address, client.city, client.country].filter(Boolean).join(', ')}
                </div>
              )}
              {client.vatNumber && (
                <div className="text-slate-600">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">N° TVA</span>
                  <p className="mt-0.5">{client.vatNumber}</p>
                </div>
              )}
            </div>
            {client.notes && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider mb-1">Notes</p>
                <p className="text-sm text-slate-600 whitespace-pre-line">{client.notes}</p>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Factures du client */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText size={15} className="text-slate-400" />
                <h3 className="text-sm font-semibold text-slate-700">Factures</h3>
                {invoices.length > 0 && (
                  <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">
                    {invoices.length}
                  </span>
                )}
              </div>
              <Link
                href={`/invoices/new?clientId=${id}`}
                className="flex items-center gap-1 text-xs text-accent-600 hover:text-accent-700 font-medium transition-colors"
              >
                <Plus size={12} /> Nouvelle facture
              </Link>
            </div>
          </CardHeader>
          <CardBody className="p-0">
            {invoices.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-slate-400">Aucune facture pour ce client</p>
                <Link
                  href="/invoices"
                  className="text-xs text-accent-600 hover:underline mt-1 inline-block"
                >
                  Créer une facture →
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {invoices.map((inv) => (
                  <Link
                    key={inv._id}
                    href={`/invoices/${inv._id}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors group"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900 font-mono">{inv.number}</p>
                      <p className="text-xs text-slate-400">
                        {fmtDate(inv.issueDate)}
                        {inv.dueDate && ` · Échéance ${fmtDate(inv.dueDate)}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge status={inv.status} />
                      <span className="text-sm font-semibold text-slate-800 tabular-nums">{fmt(inv.total)}</span>
                      <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-400 transition-colors" />
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
            <div className="flex items-center gap-2">
              <ClipboardList size={15} className="text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-700">Devis</h3>
              {quotes.length > 0 && (
                <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">
                  {quotes.length}
                </span>
              )}
            </div>
          </CardHeader>
          <CardBody className="p-0">
            {quotes.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-slate-400">Aucun devis pour ce client</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {quotes.map((q) => {
                  const st = QUOTE_STATUS[q.status] || QUOTE_STATUS.draft;
                  return (
                    <Link
                      key={q._id}
                      href={`/quotes/${q._id}`}
                      className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors group"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-900 font-mono">{q.number}</p>
                        <p className="text-xs text-slate-400">
                          {fmtDate(q.issueDate)}
                          {q.expiryDate && ` · Expire ${fmtDate(q.expiryDate)}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.color}`}>
                          {st.label}
                        </span>
                        <span className="text-sm font-semibold text-slate-800 tabular-nums">{fmt(q.total)}</span>
                        <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-400 transition-colors" />
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
