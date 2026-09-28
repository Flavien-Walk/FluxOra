'use client';

import { useState } from 'react';
import { Globe, ThumbsUp, MessageSquare, Repeat2, Send } from 'lucide-react';

const FOLD_CHARS = 210; // LinkedIn replie le texte après ~3 lignes dans le fil

// Aperçu fidèle d'un post dans le fil LinkedIn
export default function LinkedInPreview({ text, image, author }) {
  const [expanded, setExpanded] = useState(false);
  const content = text?.trim() || 'Votre post apparaîtra ici…';
  const folded = !expanded && content.length > FOLD_CHARS;
  const initials = (author?.name || 'Vous').slice(0, 2).toUpperCase();

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden text-[13px] text-slate-800">
      <div className="flex items-center gap-2.5 px-4 pt-3">
        {author?.picture ? (
          <img src={author.picture} alt="" className="w-10 h-10 rounded-full object-cover" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-[#0A66C2] text-white flex items-center justify-center text-xs font-bold">
            {initials}
          </div>
        )}
        <div className="min-w-0">
          <p className="font-semibold leading-tight truncate">{author?.name || 'Votre profil LinkedIn'}</p>
          <p className="text-[11px] text-slate-500 flex items-center gap-1">
            Maintenant · <Globe size={10} />
          </p>
        </div>
      </div>

      <div className="px-4 py-2.5 whitespace-pre-line leading-relaxed break-words">
        {folded ? content.slice(0, FOLD_CHARS).trimEnd() : content}
        {folded && (
          <button onClick={() => setExpanded(true)} className="text-slate-500 hover:text-[#0A66C2] hover:underline">
            …voir plus
          </button>
        )}
      </div>

      {image?.url && (
        <img src={image.thumbUrl || image.url} alt={image.alt || ''} className="w-full max-h-80 object-cover bg-slate-100" />
      )}

      <div className="grid grid-cols-4 border-t border-slate-100 text-[11px] font-semibold text-slate-500">
        {[[ThumbsUp, 'J\'aime'], [MessageSquare, 'Commenter'], [Repeat2, 'Republier'], [Send, 'Envoyer']].map(([Icon, label]) => (
          <span key={label} className="flex items-center justify-center gap-1.5 py-2.5">
            <Icon size={14} /> <span className="hidden sm:inline">{label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
