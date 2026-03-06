'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useClient } from '@/hooks/useClients';
import api from '@/lib/api';
import Header from '@/components/layout/Header';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import ClientForm from '@/components/modules/ClientForm';
import { ArrowLeft, Pencil, Trash2, Mail, Phone, MapPin, Building } from 'lucide-react';

export default function ClientDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { client, isLoading, mutate } = useClient(id);
  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
          <Link
            href="/clients"
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800"
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
                  <a href={`mailto:${client.email}`} className="hover:text-indigo-600">
                    {client.email}
                  </a>
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

        {/* Placeholder factures associées */}
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-gray-700">Factures</h3>
          </CardHeader>
          <CardBody>
            <p className="text-sm text-gray-400 text-center py-4">
              Les factures de ce client apparaîtront ici (Phase 6)
            </p>
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
