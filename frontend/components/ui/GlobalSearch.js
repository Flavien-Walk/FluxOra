'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search, X, FileText, Users, ClipboardList, ArrowRight,
} from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

const fmt = (n) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n ?? 0);

const TYPE_CONFIG = {
  invoice: { label: 'Facture', icon: FileText,      iconBg: 'bg-accent-50',   iconColor: 'text-accent-600'  },
  quote:   { label: 'Devis',   icon: ClipboardList, iconBg: 'bg-purple-50',   iconColor: 'text-purple-600'  },
  client:  { label: 'Client',  icon: Users,         iconBg: 'bg-success-50',  iconColor: 'text-success-600' },
};

function buildHref(type, item) {
  if (type === 'invoice') return `/invoices/${item._id}`;
  if (type === 'quote')   return `/quotes/${item._id}`;
  if (type === 'client')  return `/clients/${item._id}`;
  return '/dashboard';
}

function buildTitle(type, item) {
  if (type === 'invoice') return item.number;
  if (type === 'quote')   return item.number;
  if (type === 'client')  return item.name;
  return '';
}

function buildSub(type, item) {
  if (type === 'invoice') return `${item.clientId?.name || '—'} · ${fmt(item.total)}`;
  if (type === 'quote')   return `${item.clientId?.name || '—'} · ${fmt(item.total)}`;
  if (type === 'client')  return item.company || item.email || '';
  return '';
}

export default function GlobalSearch() {
  const router = useRouter();
  const [query,     setQuery]     = useState('');
  const [results,   setResults]   = useState([]);
  const [isOpen,    setIsOpen]    = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const inputRef    = useRef(null);
  const containerRef = useRef(null);
  const timerRef    = useRef(null);

  /* Close on outside click */
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* Debounced search */
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!query.trim() || query.length < 2) {
      setResults([]);
      setIsOpen(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    timerRef.current = setTimeout(async () => {
      try {
        const q = encodeURIComponent(query.trim());
        const [invRes, quoteRes, cliRes] = await Promise.allSettled([
          api.get(`/api/invoices?search=${q}&limit=4`),
          api.get(`/api/quotes?search=${q}&limit=4`),
          api.get(`/api/clients?search=${q}&limit=4`),
        ]);
        const items = [];
        (invRes.value?.data?.invoices  || []).forEach((i) => items.push({ type: 'invoice', item: i }));
        (quoteRes.value?.data?.quotes  || []).forEach((i) => items.push({ type: 'quote',   item: i }));
        (cliRes.value?.data?.clients   || []).forEach((i) => items.push({ type: 'client',  item: i }));

        setResults(items);
        setIsOpen(true);
        setActiveIdx(-1);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 280);
  }, [query]);

  const navigate = useCallback((type, item) => {
    router.push(buildHref(type, item));
    setQuery('');
    setIsOpen(false);
    setResults([]);
  }, [router]);

  const handleKeyDown = (e) => {
    if (!isOpen && e.key !== 'Escape') return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const r = results[activeIdx];
      if (r) navigate(r.type, r.item);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setQuery('');
      inputRef.current?.blur();
    }
  };

  const clear = () => {
    setQuery('');
    setIsOpen(false);
    setResults([]);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="relative w-64">
      {/* Input field */}
      <div className="relative">
        <Search
          size={13}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder="Rechercher…"
          className={cn(
            'w-full h-8 pl-8 pr-7 text-xs rounded-lg transition-all duration-150',
            'border border-slate-200 bg-slate-50 placeholder:text-slate-400',
            'focus:outline-none focus:ring-2 focus:ring-accent-500/40 focus:border-accent-400 focus:bg-white'
          )}
        />
        {query && (
          <button
            onClick={clear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={11} />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl shadow-lg border border-slate-200 z-50 overflow-hidden">
          {loading ? (
            <div className="px-4 py-3 text-xs text-slate-400 text-center">Recherche en cours…</div>
          ) : results.length === 0 ? (
            <div className="px-4 py-3 text-xs text-slate-400 text-center">
              Aucun résultat pour &ldquo;{query}&rdquo;
            </div>
          ) : (
            <ul className="max-h-72 overflow-y-auto py-1">
              {results.map(({ type, item }, idx) => {
                const cfg  = TYPE_CONFIG[type];
                const Icon = cfg.icon;
                return (
                  <li key={`${type}-${item._id}`}>
                    <button
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => navigate(type, item)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors',
                        activeIdx === idx ? 'bg-accent-50' : 'hover:bg-slate-50'
                      )}
                    >
                      <div className={cn(
                        'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0',
                        cfg.iconBg
                      )}>
                        <Icon size={13} className={cfg.iconColor} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-800 truncate">
                          {buildTitle(type, item)}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">
                          {cfg.label}{buildSub(type, item) ? ` · ${buildSub(type, item)}` : ''}
                        </p>
                      </div>
                      <ArrowRight size={11} className="text-slate-300 flex-shrink-0" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
