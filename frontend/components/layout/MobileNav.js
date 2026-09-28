'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { LayoutGrid, Settings, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAlerts } from '@/hooks/useAlerts';
import { NAV_GROUPS, MOBILE_TABS, isNavActive } from './navConfig';

const ALL_ITEMS = NAV_GROUPS.flatMap((g) => g.items);
const TABS = MOBILE_TABS.map((href) => ALL_ITEMS.find((i) => i.href === href));

function Badge({ count }) {
  if (!count) return null;
  return (
    <span className="absolute -top-1 -right-2 min-w-[16px] h-4 px-1 bg-amber-400 text-amber-900 text-[9px] font-bold rounded-full flex items-center justify-center tabular-nums">
      {count}
    </span>
  );
}

/* ─── Barre d'onglets fixe en bas de l'écran (mobile / tablette uniquement) ─── */
export default function MobileNav() {
  const pathname = usePathname();
  const { openCount } = useAlerts('open');
  const [moreOpen, setMoreOpen] = useState(false);

  // Ferme le panneau « Plus » à chaque changement de page
  useEffect(() => { setMoreOpen(false); }, [pathname]);

  const isActive = (href) => isNavActive(pathname, href);
  const moreActive = !TABS.some((t) => isActive(t.href));

  return (
    <>
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-slate-200"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="grid grid-cols-5 h-16">
          {TABS.map(({ href, label, icon: Icon, alertBadge }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors',
                  active ? 'text-accent-600' : 'text-slate-500 active:text-slate-600'
                )}
              >
                <span className="relative">
                  <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
                  {alertBadge && <Badge count={openCount} />}
                </span>
                {label}
              </Link>
            );
          })}
          <button
            onClick={() => setMoreOpen(true)}
            className={cn(
              'flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors',
              moreActive ? 'text-accent-600' : 'text-slate-500 active:text-slate-600'
            )}
          >
            <LayoutGrid size={20} strokeWidth={moreActive ? 2.2 : 1.8} />
            Plus
          </button>
        </div>
      </nav>

      {/* Panneau « Plus » : toutes les sections, façon bottom sheet */}
      <AnimatePresence>
        {moreOpen && (
          <>
            <motion.div
              key="more-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMoreOpen(false)}
              className="lg:hidden fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-[2px]"
            />
            <motion.div
              key="more-sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 38 }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.6 }}
              onDragEnd={(_, info) => { if (info.offset.y > 100) setMoreOpen(false); }}
              className="lg:hidden fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto bg-white rounded-t-3xl shadow-2xl"
              style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
            >
              <div className="sticky top-0 bg-white pt-3 pb-2 px-5 flex items-center justify-between">
                <div className="absolute left-1/2 top-2 -translate-x-1/2 w-10 h-1 rounded-full bg-slate-200" />
                <p className="mt-2 text-base font-semibold text-slate-900">Menu</p>
                <button
                  onClick={() => setMoreOpen(false)}
                  className="mt-2 w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500"
                  aria-label="Fermer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="px-4 space-y-5 pt-2">
                {NAV_GROUPS.map((group) => (
                  <div key={group.label}>
                    <p className="px-1 mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                      {group.label}
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {group.items.map(({ href, label, icon: Icon, alertBadge }) => {
                        const active = isActive(href);
                        return (
                          <Link
                            key={href}
                            href={href}
                            className={cn(
                              'flex flex-col items-center gap-2 rounded-2xl px-2 py-3 text-xs font-medium text-center transition-colors',
                              active ? 'bg-accent-50 text-accent-700' : 'bg-slate-50 text-slate-600 active:bg-slate-100'
                            )}
                          >
                            <span className="relative">
                              <Icon size={20} className={active ? 'text-accent-600' : 'text-slate-500'} />
                              {alertBadge && <Badge count={openCount} />}
                            </span>
                            <span className="truncate w-full">{label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}

                <Link
                  href="/settings"
                  className={cn(
                    'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium',
                    pathname === '/settings' ? 'bg-accent-50 text-accent-700' : 'bg-slate-50 text-slate-600'
                  )}
                >
                  <Settings size={18} />
                  Paramètres
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
