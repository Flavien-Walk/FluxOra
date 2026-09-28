'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Linkedin, Send, Save, CalendarClock, Trash2, PenSquare, ExternalLink, Plus, Megaphone, AlertTriangle, Unplug,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import Button from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import LinkedInPreview from '@/components/communication/LinkedInPreview';
import PhotoPicker from '@/components/communication/PhotoPicker';
import AIDraftPanel from '@/components/communication/AIDraftPanel';
import { useSocialPosts, useSocialStatus, socialApi } from '@/hooks/useSocial';
import { cn } from '@/lib/utils';

const MAX_CHARS = 3000;
const FOLD_CHARS = 1300;

const STATUS = {
  draft:      { label: 'Brouillon',        className: 'bg-slate-100 text-slate-600' },
  scheduled:  { label: 'Programmé',        className: 'bg-violet-50 text-violet-700' },
  publishing: { label: 'Publication…',     className: 'bg-amber-50 text-amber-700' },
  published:  { label: 'Publié',           className: 'bg-emerald-50 text-emerald-700' },
  failed:     { label: 'Échec',            className: 'bg-red-50 text-red-700' },
};

const TABS = [
  { id: 'all', label: 'Tous' },
  { id: 'draft', label: 'Brouillons' },
  { id: 'scheduled', label: 'Programmés' },
  { id: 'published', label: 'Publiés' },
];

const EMPTY = { id: null, text: '', image: null, imageOptions: [], brief: '', source: 'manual', status: 'draft', scheduledAt: null };

const errMsg = (err, fallback) => err.response?.data?.error || fallback;

/* ─── Carte de connexion LinkedIn ─────────────────────────────── */
function LinkedInAccountCard({ linkedin, onConnect, onDisconnect, connecting }) {
  const acc = linkedin.account;
  return (
    <Card>
      <CardBody className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#0A66C2] flex items-center justify-center flex-shrink-0">
          <Linkedin size={20} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          {acc && !acc.expired ? (
            <>
              <p className="text-sm font-semibold text-slate-900 truncate">{acc.name}</p>
              <p className="text-xs text-emerald-600">
                Connecté{acc.expiresAt && ` · expire le ${format(new Date(acc.expiresAt), 'd MMM yyyy', { locale: fr })}`}
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-slate-900">LinkedIn</p>
              <p className={cn('text-xs', acc?.expired ? 'text-amber-600' : 'text-slate-400')}>
                {acc?.expired ? 'Connexion expirée — reconnectez-vous' : !linkedin.configured ? 'Non configuré côté serveur' : 'Publiez sur votre profil'}
              </p>
            </>
          )}
        </div>
        {acc && !acc.expired ? (
          <button onClick={onDisconnect} title="Déconnecter" className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-danger-600 hover:bg-danger-50">
            <Unplug size={15} />
          </button>
        ) : (
          <Button size="sm" onClick={onConnect} loading={connecting} disabled={!linkedin.configured}>
            Connecter
          </Button>
        )}
      </CardBody>
    </Card>
  );
}

/* ─── Page ─────────────────────────────────────────────────────── */
function CommunicationContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { linkedin, unsplash, ai, mutate: mutateStatus } = useSocialStatus();
  const { posts, mutate: mutatePosts, isLoading } = useSocialPosts();

  const [draft, setDraft] = useState(EMPTY);
  const [pickerKey, setPickerKey] = useState(0);
  const [busy, setBusy] = useState(null); // 'save' | 'publish' | 'schedule' | 'connect'
  const [scheduleAt, setScheduleAt] = useState('');
  const [tab, setTab] = useState('all');

  const connected = Boolean(linkedin.account && !linkedin.account.expired);
  const editable = !['published', 'publishing'].includes(draft.status);

  const loadPost = useCallback((post) => {
    setDraft({
      id: post._id, text: post.text || '', image: post.image || null, imageOptions: post.imageOptions || [],
      brief: post.brief || '', source: post.source, status: post.status, scheduledAt: post.scheduledAt,
      externalUrl: post.externalUrl, error: post.error,
    });
    setScheduleAt(post.scheduledAt ? format(new Date(post.scheduledAt), "yyyy-MM-dd'T'HH:mm") : '');
    setPickerKey((k) => k + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Retour OAuth LinkedIn (?linkedin=connected|error) et ouverture d'un post (?post=id, depuis l'assistant)
  useEffect(() => {
    const status = params.get('linkedin');
    const postId = params.get('post');
    if (status === 'connected') { toast.success('Compte LinkedIn connecté.'); mutateStatus(); }
    if (status === 'error') toast.error(`Connexion LinkedIn impossible : ${params.get('reason') || 'erreur inconnue'}`);
    if (postId) {
      socialApi.getPost(postId).then(loadPost).catch(() => toast.error('Post introuvable.'));
    }
    if (status || postId) router.replace('/communication', { scroll: false });
  }, [params, router, mutateStatus, loadPost]);

  const payload = () => ({ text: draft.text, image: draft.image, imageOptions: draft.imageOptions, brief: draft.brief, source: draft.source });

  // Crée ou met à jour le brouillon, renvoie le post enregistré
  const persist = async () => {
    if (draft.id) return socialApi.updatePost(draft.id, { text: draft.text, image: draft.image });
    const post = await socialApi.createPost(payload());
    setDraft((d) => ({ ...d, id: post._id }));
    return post;
  };

  const save = async () => {
    setBusy('save');
    try {
      const post = await persist();
      setDraft((d) => ({ ...d, id: post._id, status: post.status }));
      mutatePosts();
      toast.success('Brouillon enregistré.');
    } catch (err) {
      toast.error(errMsg(err, 'Enregistrement impossible.'));
    } finally { setBusy(null); }
  };

  const publish = async () => {
    if (!connected) return toast.error('Connectez d\'abord votre compte LinkedIn.');
    setBusy('publish');
    try {
      const saved = await persist();
      const post = await socialApi.publishPost(saved._id);
      mutatePosts();
      toast.success('Post publié sur LinkedIn 🎉');
      loadPost(post);
    } catch (err) {
      mutatePosts();
      toast.error(errMsg(err, 'Publication impossible.'));
      if (err.response?.data?.code === 'SOCIAL_EXPIRED') mutateStatus();
    } finally { setBusy(null); }
  };

  const schedule = async (clear = false) => {
    if (!clear && !scheduleAt) return toast.error('Choisissez une date et une heure.');
    setBusy('schedule');
    try {
      const saved = await persist();
      const post = await socialApi.updatePost(saved._id, { scheduledAt: clear ? null : new Date(scheduleAt).toISOString() });
      mutatePosts();
      loadPost(post);
      toast.success(clear ? 'Programmation annulée.' : `Publication programmée le ${format(new Date(post.scheduledAt), "d MMM 'à' HH:mm", { locale: fr })}.`);
    } catch (err) {
      toast.error(errMsg(err, 'Programmation impossible.'));
    } finally { setBusy(null); }
  };

  const remove = async (post) => {
    if (!window.confirm('Supprimer ce post ?')) return;
    try {
      await socialApi.deletePost(post._id);
      if (draft.id === post._id) { setDraft(EMPTY); setPickerKey((k) => k + 1); }
      mutatePosts();
    } catch (err) {
      toast.error(errMsg(err, 'Suppression impossible.'));
    }
  };

  const connect = async () => {
    setBusy('connect');
    try {
      const { url } = await socialApi.connectLinkedIn();
      window.location.href = url;
    } catch (err) {
      toast.error(errMsg(err, 'Connexion LinkedIn impossible.'));
      setBusy(null);
    }
  };

  const disconnect = async () => {
    if (!window.confirm('Déconnecter votre compte LinkedIn de Fluxora ?')) return;
    await socialApi.disconnectLinkedIn();
    mutateStatus();
  };

  const newPost = () => { setDraft(EMPTY); setScheduleAt(''); setPickerKey((k) => k + 1); };

  const chars = draft.text.length;
  const visiblePosts = tab === 'all' ? posts : posts.filter((p) => p.status === tab);

  return (
    <>
      <Header
        title="Communication"
        subtitle="Rédigez et publiez vos posts LinkedIn"
        actions={<Button size="sm" variant="secondary" onClick={newPost}><Plus size={14} /> Nouveau post</Button>}
      />

      <div className="flex-1 p-4 lg:p-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* ── Éditeur ── */}
          <div className="lg:col-span-3 space-y-4">
            {editable && (
              <AIDraftPanel
                aiConfigured={ai.configured}
                onApply={({ text, photos, brief }) => {
                  setDraft((d) => ({ ...d, text, brief, source: 'ai', imageOptions: photos, image: photos[0] || d.image }));
                  setPickerKey((k) => k + 1);
                  toast.success('Variante insérée — ajustez-la si besoin.');
                }}
              />
            )}

            <Card>
              <CardHeader className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">{draft.id ? 'Modifier le post' : 'Nouveau post'}</p>
                <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', STATUS[draft.status]?.className)}>
                  {STATUS[draft.status]?.label}
                </span>
              </CardHeader>
              <CardBody className="space-y-4">
                {draft.error && (
                  <p className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                    <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" /> {draft.error}
                  </p>
                )}
                <div>
                  <textarea
                    value={draft.text}
                    onChange={(e) => setDraft((d) => ({ ...d, text: e.target.value.slice(0, MAX_CHARS) }))}
                    disabled={!editable}
                    rows={10}
                    placeholder="Écrivez votre post… ou laissez l'IA le rédiger au-dessus."
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-accent-500 disabled:bg-slate-50"
                  />
                  <div className="mt-1 flex justify-between text-[11px]">
                    <span className={chars > FOLD_CHARS ? 'text-amber-600' : 'text-slate-400'}>
                      {chars > FOLD_CHARS ? 'Au-delà de 1 300 caractères, le texte est replié (« voir plus »)' : 'Idéal : jusqu\'à 1 300 caractères'}
                    </span>
                    <span className={cn('tabular-nums', chars > MAX_CHARS - 100 ? 'text-danger-600' : 'text-slate-400')}>{chars} / {MAX_CHARS}</span>
                  </div>
                </div>

                {editable && (
                  <PhotoPicker
                    key={pickerKey}
                    image={draft.image}
                    options={draft.imageOptions}
                    unsplashConfigured={unsplash.configured}
                    onChange={(image) => setDraft((d) => ({ ...d, image }))}
                  />
                )}

                {editable ? (
                  <div className="space-y-3 border-t border-slate-100 pt-4">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button onClick={publish} loading={busy === 'publish'} disabled={!draft.text.trim() || !connected} className="bg-[#0A66C2] hover:bg-[#004182] sm:flex-1">
                        <Send size={14} /> Publier maintenant
                      </Button>
                      <Button variant="secondary" onClick={save} loading={busy === 'save'} disabled={!draft.text.trim()}>
                        <Save size={14} /> Enregistrer
                      </Button>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <input
                        type="datetime-local"
                        value={scheduleAt}
                        min={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
                        onChange={(e) => setScheduleAt(e.target.value)}
                        className="h-9 rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 sm:flex-1"
                      />
                      <Button variant="secondary" onClick={() => schedule(false)} loading={busy === 'schedule'} disabled={!draft.text.trim() || !connected}>
                        <CalendarClock size={14} /> Programmer
                      </Button>
                      {draft.status === 'scheduled' && (
                        <Button variant="ghost" onClick={() => schedule(true)}>Annuler la programmation</Button>
                      )}
                    </div>
                    {!connected && (
                      <p className="text-[11px] text-slate-400">Connectez LinkedIn pour publier ou programmer. Vous pouvez déjà enregistrer des brouillons.</p>
                    )}
                  </div>
                ) : draft.externalUrl && (
                  <a href={draft.externalUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-[#0A66C2] hover:underline">
                    Voir le post sur LinkedIn <ExternalLink size={13} />
                  </a>
                )}
              </CardBody>
            </Card>
          </div>

          {/* ── Compte + aperçu ── */}
          <div className="lg:col-span-2 space-y-4">
            <LinkedInAccountCard linkedin={linkedin} onConnect={connect} onDisconnect={disconnect} connecting={busy === 'connect'} />
            <div className="lg:sticky lg:top-6 space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Aperçu</p>
              <LinkedInPreview text={draft.text} image={draft.image} author={connected ? linkedin.account : null} />
            </div>
          </div>
        </div>

        {/* ── Historique ── */}
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-900">Mes posts</p>
            <div className="flex gap-1 overflow-x-auto">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={cn('whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium', tab === t.id ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100')}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </CardHeader>
          {isLoading ? (
            <CardBody><p className="text-sm text-slate-400">Chargement…</p></CardBody>
          ) : visiblePosts.length === 0 ? (
            <EmptyState icon={Megaphone} title="Aucun post pour l'instant" description="Rédigez votre premier post ci-dessus, ou demandez-le à l'assistant IA." />
          ) : (
            <div className="divide-y divide-slate-100">
              {visiblePosts.map((p) => (
                <div key={p._id} className={cn('flex items-center gap-3 px-5 py-3', draft.id === p._id && 'bg-accent-50/40')}>
                  {p.image?.thumbUrl || p.image?.url ? (
                    <img src={p.image.thumbUrl || p.image.url} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0"><Linkedin size={16} className="text-slate-400" /></div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-800 truncate">{p.text || '(sans texte)'}</p>
                    <p className="text-[11px] text-slate-400">
                      <span className={cn('mr-1.5 rounded-full px-1.5 py-0.5 font-semibold', STATUS[p.status]?.className)}>{STATUS[p.status]?.label}</span>
                      {p.status === 'published' && p.publishedAt && format(new Date(p.publishedAt), "d MMM yyyy 'à' HH:mm", { locale: fr })}
                      {p.status === 'scheduled' && p.scheduledAt && `le ${format(new Date(p.scheduledAt), "d MMM 'à' HH:mm", { locale: fr })}`}
                      {!['published', 'scheduled'].includes(p.status) && `modifié le ${format(new Date(p.updatedAt), 'd MMM', { locale: fr })}`}
                      {p.source === 'ai' && ' · ✨ IA'}
                    </p>
                  </div>
                  {p.externalUrl && (
                    <a href={p.externalUrl} target="_blank" rel="noreferrer" title="Voir sur LinkedIn" className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-[#0A66C2] hover:bg-slate-50">
                      <ExternalLink size={15} />
                    </a>
                  )}
                  <button onClick={() => loadPost(p)} title="Ouvrir" className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-accent-600 hover:bg-slate-50">
                    <PenSquare size={15} />
                  </button>
                  {p.status !== 'publishing' && (
                    <button onClick={() => remove(p)} title="Supprimer" className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-danger-600 hover:bg-danger-50">
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}

export default function CommunicationPage() {
  return (
    <Suspense fallback={null}>
      <CommunicationContent />
    </Suspense>
  );
}
