/**
 * LinkedIn — OAuth 2.0 (OpenID Connect) + publication sur le profil membre.
 * Produits requis sur l'app LinkedIn Developers :
 *   - "Sign In with LinkedIn using OpenID Connect"  (scopes openid profile email)
 *   - "Share on LinkedIn"                            (scope w_member_social)
 * Les jetons membres durent ~60 jours et ne sont pas rafraîchissables → reconnexion.
 */
const AUTH_URL  = 'https://www.linkedin.com/oauth/v2/authorization';
const TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';
const API       = 'https://api.linkedin.com';
const SCOPES    = ['openid', 'profile', 'email', 'w_member_social'];
// Version de l'API REST LinkedIn (format AAAAMM, chaque version est supportée ~1 an)
const API_VERSION = () => process.env.LINKEDIN_API_VERSION || '202606';

const isConfigured = () => Boolean(process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET);

const redirectUri = () =>
  process.env.LINKEDIN_REDIRECT_URI || `${process.env.SERVER_URL || 'http://localhost:5000'}/api/social/linkedin/callback`;

function getAuthUrl(state) {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.LINKEDIN_CLIENT_ID,
    redirect_uri: redirectUri(),
    state,
    scope: SCOPES.join(' '),
  });
  return `${AUTH_URL}?${params}`;
}

async function linkedinError(res, step) {
  let detail = '';
  try { const j = await res.json(); detail = j.message || j.error_description || j.error || ''; } catch { /* corps vide */ }
  const err = new Error(`LinkedIn (${step}) : ${res.status}${detail ? ` — ${detail}` : ''}`);
  err.status = res.status === 401 ? 401 : 502;
  err.linkedinStatus = res.status;
  return err;
}

async function exchangeCode(code) {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri(),
      client_id: process.env.LINKEDIN_CLIENT_ID,
      client_secret: process.env.LINKEDIN_CLIENT_SECRET,
    }),
  });
  if (!res.ok) throw await linkedinError(res, 'échange du code');
  const data = await res.json();
  return {
    accessToken: data.access_token,
    expiresAt: new Date(Date.now() + (data.expires_in || 0) * 1000),
    scopes: (data.scope || '').split(/[ ,]+/).filter(Boolean),
  };
}

async function getProfile(accessToken) {
  const res = await fetch(`${API}/v2/userinfo`, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw await linkedinError(res, 'profil');
  const p = await res.json();
  return { externalId: p.sub, name: p.name, picture: p.picture };
}

const restHeaders = (accessToken, extra = {}) => ({
  Authorization: `Bearer ${accessToken}`,
  'LinkedIn-Version': API_VERSION(),
  'X-Restli-Protocol-Version': '2.0.0',
  ...extra,
});

// Envoie une image (téléchargée depuis son URL) et renvoie son URN urn:li:image:...
async function uploadImage(accessToken, authorUrn, imageUrl) {
  const init = await fetch(`${API}/rest/images?action=initializeUpload`, {
    method: 'POST',
    headers: restHeaders(accessToken, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({ initializeUploadRequest: { owner: authorUrn } }),
  });
  if (!init.ok) throw await linkedinError(init, 'préparation image');
  const { value } = await init.json();

  const img = await fetch(imageUrl);
  if (!img.ok) throw new Error(`Image inaccessible (${img.status})`);
  const bytes = Buffer.from(await img.arrayBuffer());

  const put = await fetch(value.uploadUrl, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': img.headers.get('content-type') || 'image/jpeg' },
    body: bytes,
  });
  if (!put.ok) throw await linkedinError(put, 'envoi image');
  return value.image;
}

/**
 * Publie un post (texte + image optionnelle) sur le profil du membre.
 * @returns {{ externalId, externalUrl }}
 */
async function publishPost({ accessToken, personId, text, image }) {
  const author = `urn:li:person:${personId}`;
  const body = {
    author,
    commentary: escapeCommentary(text),
    visibility: 'PUBLIC',
    distribution: { feedDistribution: 'MAIN_FEED', targetEntities: [], thirdPartyDistributionChannels: [] },
    lifecycleState: 'PUBLISHED',
    isReshareDisabledByAuthor: false,
  };
  if (image?.url) {
    const imageUrn = await uploadImage(accessToken, author, image.url);
    body.content = { media: { id: imageUrn, altText: (image.alt || '').slice(0, 4000) } };
  }

  const res = await fetch(`${API}/rest/posts`, {
    method: 'POST',
    headers: restHeaders(accessToken, { 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await linkedinError(res, 'publication');
  const externalId = res.headers.get('x-restli-id') || res.headers.get('x-linkedin-id');
  return {
    externalId,
    externalUrl: externalId ? `https://www.linkedin.com/feed/update/${externalId}/` : null,
  };
}

// Le champ "commentary" utilise la syntaxe "little text" : les caractères réservés sont échappés,
// puis les #hashtags sont convertis au format {hashtag|\#|mot} pour rester cliquables.
function escapeCommentary(text) {
  return String(text || '')
    .replace(/[\\|{}@\[\]()<>#*_~]/g, (c) => `\\${c}`)
    .replace(/\\#([\p{L}\p{N}]+)/gu, '{hashtag|\\#|$1}');
}

module.exports = { isConfigured, getAuthUrl, exchangeCode, getProfile, publishPost, redirectUri };
