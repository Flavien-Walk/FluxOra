'use client';

import { useState, useMemo } from 'react';
import Header from '@/components/layout/Header';
import PartnerCard from '@/components/partners/PartnerCard';
import PartnerFilters from '@/components/partners/PartnerFilters';
import PartnerConnectModal from '@/components/partners/PartnerConnectModal';
import { usePartnerConnections } from '@/hooks/usePartnerConnections';
import { PARTNERS, CATEGORIES } from '@/data/partners';
import { Plug, Zap, Store } from 'lucide-react';

export default function PartenariatsPage() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [connectTarget, setConnectTarget]   = useState(null);
  const { isConnected, connect }            = usePartnerConnections();

  const filtered = useMemo(
    () => activeCategory === 'all'
      ? PARTNERS
      : PARTNERS.filter((p) => p.category === activeCategory),
    [activeCategory]
  );

  // Count per category for filter badges
  const counts = useMemo(() => {
    const c = { all: PARTNERS.length };
    for (const p of PARTNERS) {
      c[p.category] = (c[p.category] || 0) + 1;
    }
    return c;
  }, []);

  const connectedCount = PARTNERS.filter((p) => isConnected(p.id)).length;

  const handleConnected = (partnerId) => {
    connect(partnerId);
    setTimeout(() => setConnectTarget(null), 1800);
  };

  return (
    <>
      <Header title="Bons plans & intégrations" />

      <div className="flex-1 p-6 space-y-6">

        {/* Hero */}
        <div className="bg-white border border-slate-100 rounded-xl p-5 flex items-start justify-between gap-4 flex-wrap shadow-card">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center flex-shrink-0">
              <Store size={18} className="text-white" strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-800 mb-0.5">Marketplace Fluxora</h2>
              <p className="text-xs text-slate-500 max-w-lg leading-relaxed">
                Connectez les services essentiels à votre activité et automatisez votre gestion financière.
                Les partenaires connectés alimentent directement vos transactions, factures et comptabilité.
              </p>
            </div>
          </div>

          {/* KPIs */}
          <div className="flex gap-6 flex-shrink-0">
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-900 tabular-nums">{PARTNERS.length}</p>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mt-0.5">Partenaires</p>
            </div>
            <div className="w-px bg-slate-100" />
            <div className="text-center">
              <p className="text-2xl font-bold text-accent-700 tabular-nums">{connectedCount}</p>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mt-0.5">Connectés</p>
            </div>
          </div>
        </div>

        {/* Integration info banner */}
        <div className="bg-accent-50 border border-accent-100 rounded-xl px-5 py-3 flex items-start gap-3">
          <Zap size={15} className="text-accent-500 flex-shrink-0 mt-0.5" fill="currentColor" />
          <p className="text-sm text-accent-800">
            <span className="font-semibold">Mode simulation</span> — Les connexions sont simulées dans ce MVP.
            En production, chaque intégration sera assurée par les{' '}
            <span className="font-medium">API officielles des partenaires</span>.
          </p>
        </div>

        {/* Filters */}
        <PartnerFilters
          categories={CATEGORIES}
          active={activeCategory}
          onChange={setActiveCategory}
          counts={counts}
        />

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-3">
              <Plug size={20} className="text-slate-300" />
            </div>
            <p className="text-slate-500 font-medium">Aucun partenaire dans cette catégorie</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((partner) => (
              <PartnerCard
                key={partner.id}
                partner={partner}
                isConnected={isConnected(partner.id)}
                onConnect={setConnectTarget}
              />
            ))}
          </div>
        )}

        {/* Connected partners summary */}
        {connectedCount > 0 && (
          <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-card">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-3">
              Services connectés
            </p>
            <div className="flex flex-wrap gap-2">
              {PARTNERS.filter((p) => isConnected(p.id)).map((p) => (
                <span
                  key={p.id}
                  className="flex items-center gap-1.5 bg-accent-50 border border-accent-100 text-accent-700 text-xs font-semibold px-3 py-1.5 rounded-lg"
                >
                  <Zap size={10} fill="currentColor" />
                  {p.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Connect Modal */}
      <PartnerConnectModal
        partner={connectTarget}
        open={!!connectTarget}
        onClose={() => setConnectTarget(null)}
        onConnected={handleConnected}
      />
    </>
  );
}
