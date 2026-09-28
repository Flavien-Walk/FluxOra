'use client';

import { useUser, useClerk } from '@clerk/nextjs';
import { useState, useRef, useEffect } from 'react';
import { Bell, Settings, LogOut, Globe, ChevronDown, Zap } from 'lucide-react';
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
        <ChevronDown size={11} className={cn('text-slate-500 transition-transform duration-200', open && 'rotate-180')} />
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
                {email && <p className="text-xs text-slate-500 truncate">{email}</p>}
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
              <Settings size={14} className="text-slate-500" />
              Paramètres
            </Link>
            <a
              href="/?preview=1"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Globe size={14} className="text-slate-500" />
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
    <header
      className={cn(
        'sticky top-0 z-30 lg:static bg-white/95 backdrop-blur lg:bg-white border-b border-slate-100',
        'flex flex-wrap lg:flex-nowrap items-center gap-x-3 gap-y-2 lg:gap-4 px-4 lg:px-6 py-2.5 lg:py-0 lg:h-14 flex-shrink-0'
      )}
    >

      {/* Logo compact — mobile uniquement (la sidebar est masquée) */}
      <div className="lg:hidden w-7 h-7 bg-accent-600 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
        <Zap size={14} className="text-white" />
      </div>

      <div className="min-w-0 flex-1 lg:flex-none lg:w-40">
        <h1 className="text-base lg:text-sm font-semibold text-slate-900 truncate">{title}</h1>
        {subtitle && <p className="text-xs text-slate-500 truncate mt-0.5">{subtitle}</p>}
      </div>

      <div className="hidden md:flex flex-1 justify-center">
        <GlobalSearch />
      </div>

      {/* Mobile : les actions de la page passent sur une 2e ligne pleine largeur */}
      {actions && (
        <div className="order-last w-full flex items-center gap-2 lg:order-none lg:w-auto lg:mr-1 [&>*]:flex-1 lg:[&>*]:flex-none">
          {actions}
        </div>
      )}

      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button aria-label="Notifications" className={cn(
          'w-8 h-8 flex items-center justify-center rounded-lg',
          'text-slate-500 hover:text-slate-600 hover:bg-slate-50 transition-colors duration-150'
        )}>
          <Bell size={15} />
        </button>

        <div className="w-px h-5 bg-slate-100 mx-0.5" />

        <UserDropdown />
      </div>
    </header>
  );
}
