'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useClients } from '@/hooks/useClients';
import Header from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import ClientForm from '@/components/modules/ClientForm';
import { UserPlus, Users, Search, ChevronRight, Mail, Phone } from 'lucide-react';

export default function ClientsPage() {
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const { clients, total, isLoading, mutate } = useClients(search);

  const handleCreated = () => {
    setModalOpen(false);
    mutate();
  };

  return (
    <>
      <Header title="Clients" />
      <div className="flex-1 p-6">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center mb-6">
          <div className="relative w-full sm:w-72">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un client..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <Button onClick={() => setModalOpen(true)}>
            <UserPlus size={16} />
            Nouveau client
          </Button>
        </div>

        {/* Liste */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : clients.length === 0 ? (
          <Card>
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Users size={40} className="text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">
                {search ? 'Aucun résultat' : 'Aucun client pour le moment'}
              </p>
              {!search && (
                <p className="text-gray-400 text-sm mt-1">
                  Ajoutez votre premier client pour commencer
                </p>
              )}
            </div>
          </Card>
        ) : (
          <Card>
            <div className="divide-y divide-gray-100">
              {clients.map((client) => (
                <Link
                  key={client._id}
                  href={`/clients/${client._id}`}
                  className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0">
                      {client.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{client.name}</p>
                      {client.company && (
                        <p className="text-xs text-gray-500">{client.company}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-sm text-gray-500">
                    {client.email && (
                      <span className="hidden sm:flex items-center gap-1.5">
                        <Mail size={13} /> {client.email}
                      </span>
                    )}
                    {client.phone && (
                      <span className="hidden md:flex items-center gap-1.5">
                        <Phone size={13} /> {client.phone}
                      </span>
                    )}
                    <ChevronRight size={16} className="text-gray-400 group-hover:text-gray-600" />
                  </div>
                </Link>
              ))}
            </div>
            {total > clients.length && (
              <div className="px-6 py-3 border-t border-gray-100 text-sm text-gray-500 text-center">
                {total} clients au total
              </div>
            )}
          </Card>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nouveau client" size="lg">
        <ClientForm onSuccess={handleCreated} onCancel={() => setModalOpen(false)} />
      </Modal>
    </>
  );
}
