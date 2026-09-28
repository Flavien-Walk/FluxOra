'use client';

import { useState } from 'react';
import { Search, X, Check, Link2, ImageOff } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { socialApi } from '@/hooks/useSocial';

/**
 * Choix de la photo du post : suggestions de l'IA, recherche Unsplash, ou URL d'image.
 */
export default function PhotoPicker({ image, options = [], onChange, unsplashConfigured }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [urlMode, setUrlMode] = useState(false);
  const [url, setUrl] = useState('');

  const photos = results ?? options;

  const search = async (e) => {
    e?.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    try {
      const data = await socialApi.searchPhotos(query.trim());
      setResults(data.photos || []);
      if (!data.photos?.length) toast.info('Aucune photo trouvée pour cette recherche.');
    } catch {
      toast.error('Recherche de photos impossible.');
    } finally {
      setSearching(false);
    }
  };

  const useUrl = () => {
    if (!/^https?:\/\//i.test(url.trim())) return toast.error('Collez une URL d\'image commençant par https://');
    onChange({ url: url.trim(), source: 'url', alt: '' });
    setUrl('');
    setUrlMode(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-600">Photo</p>
        {image?.url && (
          <button onClick={() => onChange(null)} className="flex items-center gap-1 text-xs text-slate-400 hover:text-danger-600">
            <X size={12} /> Retirer la photo
          </button>
        )}
      </div>

      {unsplashConfigured ? (
        <form onSubmit={search} className="flex gap-2">
          <div className="relative flex-1">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher une photo (en anglais : office, team…)"
              className="w-full h-9 pl-8 pr-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
            />
          </div>
          <button type="submit" disabled={searching} className="h-9 px-3 rounded-lg bg-slate-100 text-sm font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-50">
            {searching ? '…' : 'Chercher'}
          </button>
        </form>
      ) : (
        <p className="text-[11px] text-slate-400">
          Recherche Unsplash non configurée (UNSPLASH_ACCESS_KEY). Vous pouvez utiliser une URL d'image.
        </p>
      )}

      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((p) => {
            const selected = image?.url === p.url;
            return (
              <button
                key={p.url}
                onClick={() => onChange(p)}
                className={cn('relative aspect-[4/3] rounded-lg overflow-hidden ring-2 transition', selected ? 'ring-accent-500' : 'ring-transparent hover:ring-slate-300')}
                title={p.creditName ? `Photo : ${p.creditName}` : ''}
              >
                <img src={p.thumbUrl || p.url} alt={p.alt || ''} className="w-full h-full object-cover" />
                {selected && (
                  <span className="absolute top-1 right-1 w-5 h-5 rounded-full bg-accent-600 text-white flex items-center justify-center">
                    <Check size={12} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {!photos.length && !image?.url && (
        <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2.5 text-xs text-slate-400">
          <ImageOff size={14} /> Aucune photo — le post sera publié en texte seul.
        </div>
      )}

      {image?.source === 'unsplash' && image.creditName && (
        <p className="text-[11px] text-slate-400">
          Photo : <a href={image.creditUrl} target="_blank" rel="noreferrer" className="underline">{image.creditName}</a> sur{' '}
          <a href="https://unsplash.com/?utm_source=fluxora&utm_medium=referral" target="_blank" rel="noreferrer" className="underline">Unsplash</a>
        </p>
      )}

      {urlMode ? (
        <div className="flex gap-2">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://…/image.jpg"
            className="flex-1 h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
          />
          <button onClick={useUrl} className="h-9 px-3 rounded-lg bg-slate-100 text-sm font-medium text-slate-700 hover:bg-slate-200">OK</button>
        </div>
      ) : (
        <button onClick={() => setUrlMode(true)} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-accent-600">
          <Link2 size={12} /> Utiliser une URL d'image
        </button>
      )}
    </div>
  );
}
