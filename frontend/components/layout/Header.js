'use client';

import { useUser, useClerk } from '@clerk/nextjs';
import { useState, useRef, useEffect } from 'react';
import { Bell, Settings, LogOut, Globe, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import GlobalSearch from '@/components/ui/GlobalSearch';

/* ─── Dropdown utilisateur type Stripe / Linear ─── */
function UserDropdown() {
  const { user, isLoaded } = useUser();
  const { signOut }        = useClerk();
  const [open, setOpen]    = useState(false);
  const ref                = useRef(null);

  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  if (!isLoaded || !user) return null;

  const avatar   = user.imageUrl;
  const name     = user.fullName || user.username || user.emailAddresses?.[0]?.emailAddress || 'Utilisateur';
  const email    = user.emailAddresses?.[0]?.emailAddress;
  const initials = name.slice(0, 2).toUpperCase();

  return (
    <div ref={ref} className="relative">
      {/* Trigger avatar */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex items-center gap-1.5 px-2 py-1.5 rounded-xl transition-all duration-150',
          open ? 'bg-slate-100' : 'hover:bg-slate-50'
        )}
        aria-label="Menu utilisateur"
      >
        {avatar ? (
          <img src={avatar} alt={name} className="w-7 h-7 rounded-full object-cover ring-2 ring-white shadow-sm" />
        ) : (
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-accent-500 to-indigo-600 flex items-center justify-center shadow-sm">
            <span className="text-white text-[11px] font-bold leading-none">{initials}</span>
          </div>
        )}
        <ChevronDown size={11} className={cn('text-slate-400 transition-transform duration-200', open && 'rotate-180')} />
      </button>

      {/* Panel dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-60 bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.12)] overflow-hidden z-50">

          {/* User info */}
          <div className="px-4 py-3.5 border-b border-slate-100 bg-slate-50/60">
            <div className="flex items-center gap-3">
              {avatar ? (
                <img src={avatar} alt={name} className="w-9 h-9 rounded-full object-cover ring-2 ring-white flex-shrink-0" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm font-bold">{initials}</span>
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{name}</p>
                {email && <p className="text-xs text-slate-400 truncate">{email}</p>}
              </div>
            </div>
          </div>

          {/* Links */}
          <div className="py-1">
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Settings size={14} className="text-slate-400" />
              Paramètres
            </Link>
            <a
              href="/?preview=1"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Globe size={14} className="text-slate-400" />
              Découvrir Fluxora
            </a>
          </div>

          {/* Sign out */}
          <div className="border-t border-slate-100 py-1">
            <button
              onClick={() => signOut({ redirectUrl: '/' })}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-danger-600 hover:bg-danger-50 transition-colors"
            >
              <LogOut size={14} />
              Déconnexion
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Header ─── */
export default function Header({ title, subtitle, actions }) {
  return (
    <header className="h-14 bg-white border-b border-slate-100 flex items-center gap-4 px-6 flex-shrink-0">

      <div className="min-w-0 w-40 flex-shrink-0">
        <h1 className="text-sm font-semibold text-slate-900 truncate">{title}</h1>
        {subtitle && <p className="text-xs text-slate-400 truncate mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex-1 flex justify-center">
        <GlobalSearch />
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0">
        {actions && <div className="flex items-center gap-2 mr-1">{actions}</div>}

        <button className={cn(
          'w-8 h-8 flex items-center justify-center rounded-lg',
          'text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors duration-150'
        )}>
          <Bell size={15} />
        </button>

        <div className="w-px h-5 bg-slate-100 mx-0.5" />

        <UserDropdown />
      </div>
    </header>
  );
}
