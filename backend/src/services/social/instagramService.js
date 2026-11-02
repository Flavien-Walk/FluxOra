/**
 * Instagram — OAuth 2.0 (Business Login for Instagram) + publication d'une photo.
 * Produit requis sur l'app Meta : "Instagram API with Instagram Login"
 *   (scopes instagram_business_basic, instagram_business_content_publish).
 * Comptes professionnels uniquement (Business ou Creator). Sans App Review (Advanced Access),
 * seuls les comptes ayant un rôle sur l'app Meta peuvent se connecter.
 * Les jetons longue durée valent 60 jours et sont renouvelables après 24 h.
 */
const { assertPublicHttpsUrl } = require('./safeUrl');

const AUTH_URL  = 'https://www.instagram.com/oauth/authorize';
const TOKEN_URL = 'https://api.instagram.com/oauth/access_token';
const GRAPH     = 'https://graph.instagram.com';
const SCOPES    = ['instagram_business_basic', 'instagram_business_content_publish'];
const API_VERSION = () => process.env.INSTAGRAM_API_VERSION || 'v26.0';

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
// Une photo est traitée en quelques secondes : au-delà, l'utilisateur relance la publication
const POLL_MS    = 3000;
const POLL_TRIES = 10;

const isConfigured = () => Boolean(process.env.INSTAGRAM_CLIENT_ID && process.env.INSTAGRAM_CLIENT_SECRET);

const redirectUri = () =>
  process.env.INSTAGRAM_REDIRECT_URI || `${process.env.SERVER_URL || 'http://localhost:5000'}/api/social/instagram/callback`;

function getAuthUrl(state) {
  const params = new URLSearchParams({
    client_id: process.env.INSTAGRAM_CLIENT_ID,
    redirect_uri: redirectUri(),
    response_type: 'code',
    scope: SCOPES.join(','),
    state,
  });
  return `${AUTH_URL}?${params}`;
}

async function instagramError(res, step) {
  let detail = '';
  let code;
  try {
    const j = await res.json();
    detail = j.error?.message || j.error_message || '';
    code = j.error?.code ?? j.code;
  } catch { /* corps vide */ }
  const err = new Error(`Instagram (${step}) : ${res.status}${detail ? ` — ${detail}` : ''}`);
  err.status = 502;
  err.tokenExpired = res.status === 401 || code === 190; // 190 : jeton OAuth invalide ou expiré
  return err;
}

const graphUrl = (path) => `${GRAPH}/${API_VERSION()}/${path}`;
const authHeaders = (accessToken, extra = {}) => ({ Authorization: `Bearer ${accessToken}`, ...extra });
const expiryFrom = (expiresIn) => new Date(Date.now() + (expiresIn || 0) * 1000);

// Échange le code contre un jeton court (1 h), puis contre un jeton longue durée (60 jours)
async function exchangeCode(code) {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.INSTAGRAM_CLIENT_ID,
      client_secret: process.env.INSTAGRAM_CLIENT_SECRET,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri(),
      code,
    }),
  });
  if (!res.ok) throw await instagramError(res, 'échange du code');
  const body = await res.json();
  const short = body.data?.[0] || body;

  const params = new URLSearchParams({
    grant_type: 'ig_exchange_token',
    client_secret: process.env.INSTAGRAM_CLIENT_SECRET,
    access_token: short.access_token,
  });
  const longRes = await fetch(`${GRAPH}/access_token?${params}`);
  if (!longRes.ok) throw await instagramError(longRes, 'jeton longue durée');
  const long = await longRes.json();

  const permissions = Array.isArray(short.permissions) ? short.permissions : String(short.permissions || '').split(',');
  return {
    accessToken: long.access_token,
    expiresAt: expiryFrom(long.expires_in),
    scopes: permissions.map((p) => p.trim()).filter(Boolean),
  };
}

async function refreshToken(accessToken) {
  const params = new URLSearchParams({ grant_type: 'ig_refresh_token', access_token: accessToken });
  const res = await fetch(`${GRAPH}/refresh_access_token?${params}`);
  if (!res.ok) throw await instagramError(res, 'renouvellement du jeton');
  const data = await res.json();
  return { accessToken: data.access_token, expiresAt: expiryFrom(data.expires_in) };
}

async function getProfile(accessToken) {
  const params = new URLSearchParams({ fields: 'user_id,username,name,account_type,profile_picture_url' });
  const res = await fetch(`${graphUrl('me')}?${params}`, { headers: authHeaders(accessToken) });
  if (!res.ok) throw await instagramError(res, 'profil');
  const p = await res.json();
  return {
    externalId: p.user_id || p.id,
    name: p.username || p.name,
    picture: p.profile_picture_url,
    accountType: p.account_type,
  };
}

/**
 * Instagram télécharge l'image lui-même et n'accepte que le JPEG.
 * Les photos Unsplash sont demandées en JPEG 4:3 (ratio accepté : 4:5 à 1.91:1) ;
 * les autres URL sont vérifiées pour renvoyer une erreur claire avant l'appel à Instagram.
 */
async function prepareImageUrl(image) {
  const url = await assertPublicHttpsUrl(image.url); // anti-SSRF : l'URL vient de l'utilisateur
  if (url.hostname === 'images.unsplash.com') {
    url.search = new URLSearchParams({ ...Object.fromEntries(url.searchParams), fm: 'jpg', fit: 'crop', w: '1080', h: '810' }).toString();
  }

  const img = await fetch(url, { redirect: 'error' });
  if (!img.ok) throw new Error(`Image inaccessible (${img.status})`);
  if (!/^image\/jpe?g/i.test(img.headers.get('content-type') || '')) {
    throw new Error('Instagram n\'accepte que les images JPEG.');
  }
  const bytes = await img.arrayBuffer();
  if (bytes.byteLength > MAX_IMAGE_BYTES) throw new Error('Image trop lourde (8 Mo max).');
  return url.toString();
}

const wait = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

// Attend que le conteneur soit prêt à publier
async function waitForContainer(accessToken, containerId, pollMs) {
  for (let i = 0; i < POLL_TRIES; i += 1) {
    const res = await fetch(`${graphUrl(containerId)}?fields=status_code`, { headers: authHeaders(accessToken) });
    if (!res.ok) throw await instagramError(res, 'statut du média');
    const { status_code: status } = await res.json();
    if (status === 'FINISHED') return;
    if (status !== 'IN_PROGRESS') {
      throw new Error('Instagram a refusé l\'image (format JPEG, ratio entre 4:5 et 1.91:1, 8 Mo max).');
    }
    await wait(pollMs);
  }
  throw new Error('Instagram met trop de temps à traiter l\'image — réessayez dans quelques minutes.');
}

/**
 * Publie une photo et sa légende en trois temps : conteneur, attente du traitement, publication.
 * @returns {{ externalId, externalUrl }}
 */
async function publishPost({ accessToken, text, image, pollMs = POLL_MS }) {
  const body = { image_url: await prepareImageUrl(image), caption: text || '' };
  if (image.alt) body.alt_text = image.alt;

  const jsonHeaders = authHeaders(accessToken, { 'Content-Type': 'application/json' });
  const container = await fetch(graphUrl('me/media'), { method: 'POST', headers: jsonHeaders, body: JSON.stringify(body) });
  if (!container.ok) throw await instagramError(container, 'préparation du média');
  const { id: containerId } = await container.json();

  await waitForContainer(accessToken, containerId, pollMs);

  const published = await fetch(graphUrl('me/media_publish'), {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ creation_id: containerId }),
  });
  if (!published.ok) throw await instagramError(published, 'publication');
  const { id: externalId } = await published.json();

  // Le post est en ligne : un lien introuvable ne doit pas le marquer en échec
  let externalUrl = null;
  try {
    const link = await fetch(`${graphUrl(externalId)}?fields=permalink`, { headers: authHeaders(accessToken) });
    if (link.ok) externalUrl = (await link.json()).permalink || null;
  } catch (e) {
    console.error('[Instagram] permalink', e.message);
  }
  return { externalId, externalUrl };
}

module.exports = { isConfigured, getAuthUrl, exchangeCode, refreshToken, getProfile, publishPost, redirectUri };
