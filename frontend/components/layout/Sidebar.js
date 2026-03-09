'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  FileText,
  ClipboardList,
  Receipt,
  BookOpen,
  Settings,
  Zap,
  CreditCard,
  ArrowUpRight,
  FileBarChart,
} from 'lucide-react';
import { useAlerts } from '@/hooks/useAlerts';

const navItems = [
  { href: '/dashboard',  label: 'Dashboard',       icon: LayoutDashboard },
  { href: '/clients',    label: 'Clients',          icon: Users },
  { href: '/invoices',   label: 'Factures',         icon: FileText },
  { href: '/quotes',     label: 'Devis',            icon: ClipboardList },
  { href: '/expenses',   label: 'Dépenses',         icon: Receipt,       alertBadge: true },
  { href: '/cards',      label: 'Cartes',           icon: CreditCard },
  { href: '/transfers',  label: 'Virements',        icon: ArrowUpRight },
  { href: '/accounting', label: 'Comptabilité',     icon: BookOpen },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { openCount } = useAlerts('open');

  return (
    <aside className="w-64 min-h-screen bg-white border-r border-gray-200 flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center gap-2 px-6 border-b border-gray-100">
        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
          <Zap size={16} className="text-white" />
        </div>
        <span className="text-lg font-bold text-gray-900">Fluxora</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon, alertBadge }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/');
          const count = alertBadge ? openCount : 0;
          return (
            <Link
              key={href}
              href={href}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                transition-colors
                ${isActive
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }
              `}
            >
              <Icon size={18} />
              <span className="flex-1">{label}</span>
              {count > 0 && (
                <span className="bg-yellow-400 text-yellow-900 text-xs font-bold px-1.5 py-0.5 rounded-full leading-none">
                  {count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Settings en bas */}
      <div className="px-3 py-4 border-t border-gray-100">
        <Link
          href="/settings"
          className={`
            flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
            transition-colors
            ${pathname === '/settings'
              ? 'bg-indigo-50 text-indigo-700'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }
          `}
        >
          <Settings size={18} />
          Paramètres
        </Link>
      </div>
    </aside>
  );
}
