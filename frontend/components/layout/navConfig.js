import {
  LayoutDashboard, Users, FileText, ClipboardList,
  Receipt, BookOpen, CreditCard, ArrowUpRight, ArrowLeftRight, Landmark, TrendingUp,
} from 'lucide-react';

// Navigation partagée entre la Sidebar (desktop) et la barre d'onglets (mobile)
export const NAV_GROUPS = [
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
      { href: '/vat',        label: 'TVA',          icon: Landmark },
    ],
  },
  {
    label: 'Croissance',
    items: [
      { href: '/investissements', label: 'Investissements', icon: TrendingUp },
    ],
  },
];

// Onglets affichés directement dans la barre du bas sur mobile
export const MOBILE_TABS = ['/dashboard', '/invoices', '/expenses', '/transactions'];

export const isNavActive = (pathname, href) =>
  pathname === href || (href !== '/dashboard' && pathname.startsWith(href + '/'));
