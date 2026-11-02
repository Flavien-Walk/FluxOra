/**
 * Module Communication — connexion LinkedIn et Instagram, posts, rédaction IA, photos.
 *   publicRouter : callback OAuth (monté AVANT clerkMiddleware, sécurisé par le state signé)
 *   router       : routes authentifiées
 */
const express = require('express');
const { requireAuth } = require('../middleware/auth');
const Organization  = require('../models/Organization');
const SocialPost    = require('../models/SocialPost');
const SocialAccount = require('../models/SocialAccount');
const linkedin = require('../services/social/linkedinService');
const instagram = require('../services/social/instagramService');
const unsplash = require('../services/social/unsplashService');
const { encrypt, signState, verifyState } = require('../services/social/socialCrypto');
const { NETWORKS, getAccount, publicAccount, publishSocialPost } = require('../services/social/socialPostService');
const { generateSocialDrafts } = require('../agents/skills/marketingSkill');

const getUserOrg = (userId) =>
  Organization.findOne({ $or: [{ clerkOwnerId: userId }, { 'members.clerkUserId': userId }] });

const clientUrl = () => process.env.CLIENT_URL || 'http://localhost:3000';

/* ══════════════════════════════════════════════════════════════
   PUBLIC — callbacks OAuth
   ══════════════════════════════════════════════════════════════ */
const publicRouter = express.Router();

const oauthCallback = (network, service) => async (req, res) => {
  const back = (params) => res.redirect(`${clientUrl()}/communication?${new URLSearchParams(params)}`);
  const { code, state, error, error_description: errorDescription } = req.query;

  if (error) return back({ [network]: 'error', reason: errorDescription || error });
  const data = verifyState(state);
  if (!data || !code) return back({ [network]: 'error', reason: 'Lien de connexion invalide ou expiré.' });

  try {
    const token   = await service.exchangeCode(code);
    const profile = await service.getProfile(token.accessToken);
    if (profile.accountType === 'PERSONAL') {
      return back({ [network]: 'error', reason: 'Instagram n\'autorise la publication que depuis un compte professionnel (Business ou Creator).' });
    }
    await SocialAccount.findOneAndUpdate(
      { organizationId: data.o, clerkUserId: data.u, network },
      {
        externalId: profile.externalId,
        name: profile.name,
        picture: profile.picture,
        accessToken: encrypt(token.accessToken),
        expiresAt: token.expiresAt,
        scopes: token.scopes,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    back({ [network]: 'connected' });
  } catch (err) {
    console.error(`[${network}] callback`, err.message);
    back({ [network]: 'error', reason: err.message });
  }
};

publicRouter.get('/linkedin/callback', oauthCallback('linkedin', linkedin));
publicRouter.get('/instagram/callback', oauthCallback('instagram', instagram));

/* ══════════════════════════════════════════════════════════════
   AUTHENTIFIÉ
   ══════════════════════════════════════════════════════════════ */
const router = express.Router();
router.use(requireAuth);

// Charge l'organisation de l'utilisateur pour toutes les routes
router.use(async (req, res, next) => {
  const org = await getUserOrg(req.userId);
  if (!org) return res.status(404).json({ error: 'Organisation introuvable.' });
  req.org = org;
  next();
});

const sanitizeImage = (img) => {
  if (!img?.url || !/^https?:\/\//i.test(img.url)) return undefined;
  const pick = ({ url, thumbUrl, alt, source, creditName, creditUrl, downloadLocation }) =>
    ({ url, thumbUrl, alt, source: source === 'unsplash' ? 'unsplash' : 'url', creditName, creditUrl, downloadLocation });
  return pick(img);
};

/* ── Statut des intégrations ─────────────────────────────────── */
router.get('/status', async (req, res) => {
  const [linkedinAcc, instagramAcc] = await Promise.all([
    getAccount(req.org._id, req.userId, 'linkedin'),
    getAccount(req.org._id, req.userId, 'instagram'),
  ]);
  res.json({
    linkedin: { configured: linkedin.isConfigured(), account: publicAccount(linkedinAcc) },
    instagram: { configured: instagram.isConfigured(), account: publicAccount(instagramAcc) },
    unsplash: { configured: unsplash.isConfigured() },
    ai:       { configured: Boolean(process.env.ANTHROPIC_API_KEY) },
  });
});

/* ── Connexion / déconnexion des réseaux ─────────────────────── */
router.get('/linkedin/connect', (req, res) => {
  if (!linkedin.isConfigured()) {
    return res.status(503).json({ error: 'LinkedIn n\'est pas configuré (LINKEDIN_CLIENT_ID / LINKEDIN_CLIENT_SECRET).', code: 'LINKEDIN_NOT_CONFIGURED' });
  }
  const state = signState({ u: req.userId, o: String(req.org._id) });
  res.json({ url: linkedin.getAuthUrl(state) });
});

router.get('/instagram/connect', (req, res) => {
  if (!instagram.isConfigured()) {
    return res.status(503).json({ error: 'Instagram n\'est pas configuré (INSTAGRAM_CLIENT_ID / INSTAGRAM_CLIENT_SECRET).', code: 'INSTAGRAM_NOT_CONFIGURED' });
  }
  const state = signState({ u: req.userId, o: String(req.org._id) });
  res.json({ url: instagram.getAuthUrl(state) });
});

const disconnect = (network) => async (req, res) => {
  await SocialAccount.deleteOne({ organizationId: req.org._id, clerkUserId: req.userId, network });
  res.json({ ok: true });
};

router.delete('/linkedin', disconnect('linkedin'));
router.delete('/instagram', disconnect('instagram'));

/* ── Rédaction IA (compétence marketing) ─────────────────────── */
router.post('/ai/draft', async (req, res) => {
  const { brief, tone, audience, network = 'linkedin' } = req.body || {};
  if (!NETWORKS[network]) return res.status(400).json({ error: 'Réseau inconnu.' });
  if (req.org.aiEnabled === false) return res.status(403).json({ error: 'L’IA est désactivée pour votre organisation.', code: 'AI_DISABLED' });
  if (!brief || String(brief).trim().length < 5) return res.status(400).json({ error: 'Décrivez le sujet du post (brief).' });
  try {
    const { variants, imageQuery } = await generateSocialDrafts({
      network, brief: String(brief).slice(0, 2000), tone, audience, orgName: req.org.name,
    });
    const photos = await unsplash.searchPhotos(imageQuery);
    res.json({ variants, imageQuery, photos });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message, code: err.code });
  }
});

/* ── Photos Unsplash ─────────────────────────────────────────── */
router.get('/photos', async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (!q) return res.json({ photos: [] });
  res.json({ photos: await unsplash.searchPhotos(q, 12), configured: unsplash.isConfigured() });
});

/* ── Posts ───────────────────────────────────────────────────── */
router.get('/posts', async (req, res) => {
  const query = { organizationId: req.org._id };
  if (req.query.status) query.status = req.query.status;
  const posts = await SocialPost.find(query).sort({ updatedAt: -1 }).limit(100).lean();
  res.json({ posts });
});

router.get('/posts/:id', async (req, res) => {
  const post = await SocialPost.findOne({ _id: req.params.id, organizationId: req.org._id }).lean();
  if (!post) return res.status(404).json({ error: 'Post introuvable.' });
  res.json({ post });
});

router.post('/posts', async (req, res) => {
  const { text = '', image, imageOptions, brief, source, network = 'linkedin' } = req.body || {};
  if (!NETWORKS[network]) return res.status(400).json({ error: 'Réseau inconnu.' });
  const post = await SocialPost.create({
    organizationId: req.org._id,
    createdBy: req.userId,
    network,
    text: String(text).slice(0, NETWORKS[network].maxChars),
    image: sanitizeImage(image),
    imageOptions: (imageOptions || []).map(sanitizeImage).filter(Boolean).slice(0, 12),
    brief,
    source: source === 'ai' ? 'ai' : 'manual',
  });
  res.status(201).json({ post });
});

router.patch('/posts/:id', async (req, res) => {
  const post = await SocialPost.findOne({ _id: req.params.id, organizationId: req.org._id });
  if (!post) return res.status(404).json({ error: 'Post introuvable.' });
  if (['published', 'publishing'].includes(post.status)) return res.status(409).json({ error: 'Un post publié ne peut plus être modifié.' });

  const { text, image, scheduledAt, network } = req.body || {};
  if (network !== undefined && network !== post.network) {
    if (!NETWORKS[network]) return res.status(400).json({ error: 'Réseau inconnu.' });
    if (post.status === 'scheduled') return res.status(409).json({ error: 'Annulez la programmation avant de changer de réseau.' });
    post.network = network;
  }
  const rules = NETWORKS[post.network];
  if (text !== undefined) post.text = String(text).slice(0, rules.maxChars);
  if (image !== undefined) post.image = image ? sanitizeImage(image) : undefined;

  if (scheduledAt !== undefined) {
    if (scheduledAt === null) {
      post.scheduledAt = undefined;
      post.status = 'draft';
    } else {
      const date = new Date(scheduledAt);
      if (Number.isNaN(date.getTime()) || date < new Date(Date.now() - 60_000)) {
        return res.status(400).json({ error: 'Date de programmation invalide ou passée.' });
      }
      if (rules.imageRequired && !post.image?.url) {
        return res.status(400).json({ error: `${rules.label} exige une image.`, code: 'SOCIAL_IMAGE_REQUIRED' });
      }
      const acc = await getAccount(req.org._id, req.userId, post.network);
      if (!acc) return res.status(400).json({ error: `Connectez ${rules.label} avant de programmer un post.`, code: 'SOCIAL_NOT_CONNECTED' });
      post.scheduledAt = date;
      post.status = 'scheduled';
    }
  } else if (post.status === 'failed') {
    post.status = 'draft';
  } else if (post.status === 'scheduled' && rules.imageRequired && !post.image?.url) {
    return res.status(400).json({ error: `${rules.label} exige une image.`, code: 'SOCIAL_IMAGE_REQUIRED' });
  }
  post.error = post.status === 'draft' ? undefined : post.error;
  await post.save();
  res.json({ post });
});

router.delete('/posts/:id', async (req, res) => {
  const result = await SocialPost.deleteOne({ _id: req.params.id, organizationId: req.org._id, status: { $ne: 'publishing' } });
  if (!result.deletedCount) return res.status(404).json({ error: 'Post introuvable.' });
  res.json({ ok: true });
});

router.post('/posts/:id/publish', async (req, res) => {
  try {
    const post = await publishSocialPost(req.org._id, req.params.id, req.userId);
    res.json({ post });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message, code: err.code });
  }
});

module.exports = { router, publicRouter };
