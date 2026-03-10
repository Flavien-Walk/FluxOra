'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Users, FileText, ClipboardList,
  Receipt, BookOpen, Settings, Zap,
  CreditCard, ArrowUpRight, ArrowLeftRight,
} from 'lucide-react';
import { useAlerts } from '@/hooks/useAlerts';

const NAV_GROUPS = [
  {
    label: 'Accueil',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Gestion',
    items: [
      { href: '/clients',  label: 'Clients',  icon: Users },
      { href: '/invoices', label: 'Factures', icon: FileText },
      { href: '/quotes',   label: 'Devis',    icon: ClipboardList },
      { href: '/expenses', label: 'Dépenses', icon: Receipt, alertBadge: true },
    ],
  },
  {
    label: 'Finance',
    items: [
      { href: '/cards',        label: 'Cartes',       icon: CreditCard },
      { href: '/transfers',    label: 'Virements',    icon: ArrowUpRight },
      { href: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
    ],
  },
  {
    label: 'Analyse',
    items: [
      { href: '/accounting', label: 'Comptabilité', icon: BookOpen },
    ],
  },
];

function NavItem({ href, label, icon: Icon, isActive, badge }) {
  return (
    <Link
      href={href}
      className={cn(
        'group relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium',
        'transition-all duration-150',
        isActive
          ? 'bg-white/[0.12] text-white'
          : 'text-slate-400 hover:bg-white/[0.07] hover:text-slate-100'
      )}
    >
      {/* Active left indicator */}
      {isActive && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-accent-400 rounded-r-full" />
      )}
      <Icon
        size={15}
        className={cn(
          'flex-shrink-0 transition-colors duration-150',
          isActive ? 'text-accent-400' : 'text-slate-500 group-hover:text-slate-300'
        )}
      />
      <span className="flex-1 truncate">{label}</span>
      {badge > 0 && (
        <span className="bg-amber-400 text-amber-900 text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none tabular-nums">
          {badge}
        </span>
      )}
    </Link>
  );
}

export default function Sidebar() {
  const pathname  = usePathname();
  const { openCount } = useAlerts('open');

  const isActive = (href) =>
    pathname === href || (href !== '/dashboard' && pathname.startsWith(href + '/'));

  return (
    <aside className="w-56 min-h-screen flex flex-col sidebar-scroll"
      style={{ background: 'var(--sidebar-bg)', borderRight: '1px solid var(--sidebar-border)' }}>
      {/* Logo */}
      <div className="h-14 flex items-center gap-2.5 px-4 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--sidebar-border)' }}>
        <div className="w-7 h-7 bg-accent-500 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
          <Zap size={13} className="text-white" fill="currentColor" />
        </div>
        <span className="text-sm font-bold text-slate-100 tracking-tight">Fluxora</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-5 overflow-y-auto sidebar-scroll">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-600 select-none">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map(({ href, label, icon, alertBadge }) => (
                <NavItem
                  key={href}
                  href={href}
                  label={label}
                  icon={icon}
                  isActive={isActive(href)}
                  badge={alertBadge ? openCount : 0}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Settings + landing link */}
      <div className="px-2 pb-4 pt-3 flex-shrink-0 space-y-0.5"
        style={{ borderTop: '1px solid var(--sidebar-border)' }}>
        <NavItem
          href="/settings"
          label="Paramètres"
          icon={Settings}
          isActive={pathname === '/settings'}
          badge={0}
        />
        {/* Lien discret vers la landing page */}
        <a
          href="/?preview=1"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] text-slate-600 hover:text-slate-400 hover:bg-white/[0.04] transition-all duration-150"
        >
          <span className="w-1 h-1 rounded-full bg-slate-600 flex-shrink-0" />
          Découvrir Fluxora
        </a>
      </div>
    </aside>
  );
}
