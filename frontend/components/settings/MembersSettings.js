'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Users, UserPlus, Trash2, Mail } from 'lucide-react';
import api from '@/lib/api';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import Button from '@/components/ui/Button';

const fetcher = async (url) => (await api.get(url)).data;
const ROLE_HELP = {
  viewer: 'consulte tout, ne modifie rien',
  manager: 'clients, devis, factures, dépenses',
  finance: '+ virements, cartes, TVA, comptabilité, placements',
  admin: 'tout, y compris les paramètres et les membres',
};

/**
 * Membres de l'organisation : noms lisibles, rôles, invitations par email.
 */
export default function MembersSettings() {
  const { data, mutate } = useSWR('/api/organizations/me/members', fetcher);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('manager');
  const [busy, setBusy] = useState(null);
  const canManage = data?.canManage;
  const roles = data?.roles || [];

  const run = async (key, fn, success) => {
    setBusy(key);
    try { const r = await fn(); toast.success(success || r?.data?.message || 'Enregistré.'); mutate(); }
    catch (err) { toast.error(err.response?.data?.error || 'Action impossible.'); }
    finally { setBusy(null); }
  };

  const invite = (e) => {
    e.preventDefault();
    run('invite', () => api.post('/api/organizations/me/members/invite', { email, role })).then(() => setEmail(''));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Users size={16} className="text-slate-500" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-slate-900">Membres de l’organisation</h2>
        </div>
      </CardHeader>
      <CardBody className="space-y-5">
        <ul className="divide-y divide-slate-100">
          {(data?.members || []).map((m) => (
            <li key={m.clerkUserId} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
              <div className="flex min-w-0 items-center gap-3">
                {m.imageUrl
                  ? <img src={m.imageUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
                  : <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-100 text-xs font-bold text-accent-700">{(m.name || m.email || '?').slice(0, 2).toUpperCase()}</span>}
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">{m.name || m.email || 'Membre'}{m.isMe && <span className="ml-1 text-xs text-slate-500">(vous)</span>}</p>
                  <p className="truncate text-xs text-slate-500">{m.email}{m.isOwner && ' · propriétaire'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {canManage && !m.isOwner ? (
                  <>
                    <label htmlFor={`role-${m.clerkUserId}`} className="sr-only">Rôle de {m.name || m.email}</label>
                    <select id={`role-${m.clerkUserId}`} value={m.role} disabled={busy === m.clerkUserId}
                      onChange={(e) => run(m.clerkUserId, () => api.patch(`/api/organizations/me/members/${m.clerkUserId}`, { role: e.target.value }), 'Rôle modifié.')}
                      className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500">
                      {roles.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                    </select>
                    <button aria-label={`Retirer ${m.name || m.email}`} disabled={busy === m.clerkUserId}
                      onClick={() => window.confirm(`Retirer ${m.name || m.email} de l’organisation ?`) && run(m.clerkUserId, () => api.delete(`/api/organizations/me/members/${m.clerkUserId}`), 'Membre retiré.')}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-danger-50 hover:text-danger-600"><Trash2 size={14} /></button>
                  </>
                ) : (
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">{m.roleLabel}</span>
                )}
              </div>
            </li>
          ))}
        </ul>

        {data?.invites?.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Invitations en attente</p>
            <ul className="divide-y divide-slate-100">
              {data.invites.map((i) => (
                <li key={i.email} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="flex min-w-0 items-center gap-2 text-slate-700"><Mail size={14} className="text-slate-500" aria-hidden="true" /><span className="truncate">{i.email}</span>
                    <span className="text-xs text-slate-500">· {roles.find((r) => r.id === i.role)?.label || i.role}</span></span>
                  {canManage && (
                    <button onClick={() => run(i.email, () => api.delete(`/api/organizations/me/invites/${encodeURIComponent(i.email)}`), 'Invitation annulée.')}
                      className="text-xs text-slate-500 hover:text-danger-600">Annuler</button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {canManage && (
          <form onSubmit={invite} className="space-y-2 border-t border-slate-100 pt-4">
            <p className="text-sm font-medium text-slate-800">Inviter un collaborateur</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <label htmlFor="invite-email" className="sr-only">Email</label>
              <input id="invite-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="prenom.nom@entreprise.fr"
                className="flex-1 h-9 rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500" />
              <label htmlFor="invite-role" className="sr-only">Rôle</label>
              <select id="invite-role" value={role} onChange={(e) => setRole(e.target.value)}
                className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500">
                {roles.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
              <Button type="submit" size="sm" loading={busy === 'invite'}><UserPlus size={14} /> Inviter</Button>
            </div>
            <p className="text-xs text-slate-500">{roles.find((r) => r.id === role)?.label} : {ROLE_HELP[role]}. La personne reçoit un email et rejoint l’organisation en créant son compte avec cette adresse.</p>
          </form>
        )}
      </CardBody>
    </Card>
  );
}
