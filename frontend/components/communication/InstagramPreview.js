'use client';

import { useState } from 'react';
import { Bookmark, Heart, ImagePlus, MessageCircle, Send } from 'lucide-react';

const FOLD_CHARS = 125; // Instagram replie la légende après ~125 caractères dans le fil

// Aperçu fidèle d'un post dans le fil Instagram
export default function InstagramPreview({ text, image, author }) {
  const [expanded, setExpanded] = useState(false);
  const username = author?.name || 'votre_compte';
  const content = text?.trim() || 'Votre légende apparaîtra ici…';
  const folded = !expanded && content.length > FOLD_CHARS;

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden text-[13px] text-slate-800">
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        {author?.picture ? (
          <img src={author.picture} alt="" className="w-8 h-8 rounded-full object-cover" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white flex items-center justify-center text-[11px] font-bold">
            {username.slice(0, 2).toUpperCase()}
          </div>
        )}
        <p className="font-semibold truncate">{username}</p>
      </div>

      {image?.url ? (
        <img src={image.thumbUrl || image.url} alt={image.alt || ''} className="w-full aspect-[4/3] object-cover bg-slate-100" />
      ) : (
        <div className="w-full aspect-[4/3] bg-slate-50 flex flex-col items-center justify-center gap-2 text-xs text-slate-500">
          <ImagePlus size={22} />
          Photo obligatoire sur Instagram
        </div>
      )}

      <div className="flex items-center gap-3.5 px-3 pt-2.5 text-slate-700">
        <Heart size={20} />
        <MessageCircle size={20} />
        <Send size={20} />
        <Bookmark size={20} className="ml-auto" />
      </div>

      <div className="px-3 py-2.5 whitespace-pre-line leading-relaxed break-words">
        <span className="font-semibold mr-1.5">{username}</span>
        {folded ? content.slice(0, FOLD_CHARS).trimEnd() : content}
        {folded && (
          <button onClick={() => setExpanded(true)} className="text-slate-500 hover:text-slate-800">
            …plus
          </button>
        )}
      </div>
    </div>
  );
}
