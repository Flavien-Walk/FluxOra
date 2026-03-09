'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useClients } from '@/hooks/useClients';
import { cn } from '@/lib/utils';
import Header from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import EmptyState from '@/components/ui/EmptyState';
import { SkeletonTable } from '@/components/ui/Skeleton';
import ClientForm from '@/components/modules/ClientForm';
import { UserPlus, Users, Search, ChevronRight, Mail, Phone } from 'lucide-react';

export default function ClientsPage() {
  const [search, setSearch]       = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const { clients, total, isLoading, mutate } = useClients(search);

  return (
    <>
      <Header
        title="Clients"
        actions={
          <Button size="sm" onClick={() => setModalOpen(true)}>
            <UserPlus size={14} /> Nouveau client
          </Button>
        }
      />
      <div className="flex-1 p-6">
        {/* Recherche */}
        <div className="relative w-full sm:w-72 mb-5">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher un client…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={cn(
              'w-full pl-9 pr-3 h-9 border border-slate-200 rounded-lg text-sm bg-white',
              'focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent',
              'placeholder:text-slate-400 transition-shadow'
            )}
          />
        </div>

        {/* Contenu */}
        {isLoading ? (
          <Card><SkeletonTable rows={6} cols={4} /></Card>
        ) : clients.length === 0 ? (
          <Card>
            <EmptyState
              icon={Users}
              title={search ? 'Aucun résultat' : 'Aucun client'}
              description={search ? `Aucun client ne correspond à "${search}".` : 'Ajoutez votre premier client pour commencer.'}
              action={!search ? () => setModalOpen(true) : undefined}
              actionLabel="Nouveau client"
            />
          </Card>
        ) : (
          <Card>
            <div className="divide-y divide-slate-50">
              {clients.map((client) => (
                <Link
                  key={client._id}
                  href={`/clients/${client._id}`}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50/80 transition-colors group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-9 h-9 bg-accent-50 text-accent-600 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                      {client.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 text-sm truncate">{client.name}</p>
                      {client.company && (
                        <p className="text-xs text-slate-400 truncate">{client.company}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-5 text-xs text-slate-400 flex-shrink-0">
                    {client.email && (
                      <span className="hidden sm:flex items-center gap-1.5">
                        <Mail size={12} /> {client.email}
                      </span>
                    )}
                    {client.phone && (
                      <span className="hidden md:flex items-center gap-1.5">
                        <Phone size={12} /> {client.phone}
                      </span>
                    )}
                    <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
            {total > clients.length && (
              <div className="px-5 py-3 border-t border-slate-100 text-xs text-slate-400 text-center">
                {total} clients au total
              </div>
            )}
          </Card>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nouveau client" size="lg">
        <ClientForm onSuccess={() => { setModalOpen(false); mutate(); }} onCancel={() => setModalOpen(false)} />
      </Modal>
    </>
  );
}
