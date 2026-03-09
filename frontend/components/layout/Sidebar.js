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
      { href: '/cards',     label: 'Cartes',       icon: CreditCard },
      { href: '/transfers', label: 'Virements',    icon: ArrowUpRight },
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
        'group flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium',
        'transition-all duration-150',
        isActive
          ? 'bg-accent-50 text-accent-700'
          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
      )}
    >
      <Icon
        size={16}
        className={cn(
          'flex-shrink-0 transition-colors duration-150',
          isActive ? 'text-accent-600' : 'text-gray-400 group-hover:text-gray-600'
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
    <aside className="w-56 min-h-screen bg-white border-r border-gray-100 flex flex-col">
      {/* Logo */}
      <div className="h-14 flex items-center gap-2.5 px-4 border-b border-gray-100">
        <div className="w-7 h-7 bg-accent-600 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
          <Zap size={14} className="text-white" />
        </div>
        <span className="text-sm font-bold text-gray-900 tracking-tight">Fluxora</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-5 overflow-y-auto">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400 select-none">
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

      {/* Settings */}
      <div className="px-2 pb-4 border-t border-gray-100 pt-3">
        <NavItem
          href="/settings"
          label="Paramètres"
          icon={Settings}
          isActive={pathname === '/settings'}
          badge={0}
        />
      </div>
    </aside>
  );
}
