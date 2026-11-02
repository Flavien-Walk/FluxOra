/**
 * Logique partagée des posts sociaux : publication (route, agent IA, cron) et programmation.
 */
const SocialPost    = require('../../models/SocialPost');
const SocialAccount = require('../../models/SocialAccount');
const linkedin      = require('./linkedinService');
const instagram     = require('./instagramService');
const unsplash      = require('./unsplashService');
const { decrypt, encrypt } = require('./socialCrypto');

const httpError = (status, message, code) => Object.assign(new Error(message), { status, code });

// Règles propres à chaque réseau
const NETWORKS = {
  linkedin:  { label: 'LinkedIn',  service: linkedin,  maxChars: 3000, imageRequired: false },
  instagram: { label: 'Instagram', service: instagram, maxChars: 2200, imageRequired: true },
};

const DAY_MS = 24 * 60 * 60 * 1000;
const REFRESH_BEFORE_MS = 15 * DAY_MS;

// Compte connecté exploitable (jeton non expiré), sans le jeton
async function getAccount(orgId, clerkUserId, network = 'linkedin') {
  const acc = await SocialAccount.findOne({ organizationId: orgId, clerkUserId, network });
  if (!acc) return null;
  return acc;
}

function publicAccount(acc) {
  if (!acc) return null;
  return {
    network: acc.network,
    name: acc.name,
    picture: acc.picture,
    expiresAt: acc.expiresAt,
    expired: acc.expiresAt ? acc.expiresAt < new Date() : false,
  };
}

// Renouvelle un jeton proche de l'expiration (réseaux qui le permettent, jeton de plus de 24 h)
async function refreshTokenIfNeeded(acc, service) {
  const accessToken = decrypt(acc.accessToken);
  if (!service.refreshToken || !acc.expiresAt) return accessToken;
  const expiresSoon = acc.expiresAt.getTime() - Date.now() < REFRESH_BEFORE_MS;
  const oldEnough = Date.now() - acc.updatedAt.getTime() > DAY_MS;
  if (!expiresSoon || !oldEnough) return accessToken;
  try {
    const token = await service.refreshToken(accessToken);
    acc.accessToken = encrypt(token.accessToken);
    acc.expiresAt = token.expiresAt;
    await acc.save();
    return token.accessToken;
  } catch (e) {
    console.error('[Social] Renouvellement du jeton impossible :', e.message); // le jeton actuel reste valable
    return accessToken;
  }
}

/**
 * Publie un post sur son réseau avec le compte de son auteur.
 * Met à jour le statut (published / failed) et renvoie le post.
 */
async function publishSocialPost(orgId, postId, clerkUserId) {
  const post = await SocialPost.findOne({ _id: postId, organizationId: orgId });
  if (!post) throw httpError(404, 'Post introuvable.');
  if (post.status === 'published') throw httpError(409, 'Ce post est déjà publié.');
  if (!post.text?.trim() && !post.image?.url) throw httpError(400, 'Le post est vide.');

  const network = NETWORKS[post.network];
  if (network.imageRequired && !post.image?.url) {
    throw httpError(400, `${network.label} exige une image.`, 'SOCIAL_IMAGE_REQUIRED');
  }
  if (post.text.length > network.maxChars) {
    throw httpError(400, `Le texte dépasse la limite de ${network.label} (${network.maxChars} caractères).`);
  }

  const acc = await getAccount(orgId, clerkUserId || post.createdBy, post.network);
  if (!acc) throw httpError(400, `Aucun compte ${network.label} connecté.`, 'SOCIAL_NOT_CONNECTED');
  if (acc.expiresAt && acc.expiresAt < new Date()) throw httpError(400, `La connexion ${network.label} a expiré — reconnectez votre compte.`, 'SOCIAL_EXPIRED');

  post.status = 'publishing';
  post.error = undefined;
  await post.save();

  try {
    const { externalId, externalUrl } = await network.service.publishPost({
      accessToken: await refreshTokenIfNeeded(acc, network.service),
      personId: acc.externalId,
      text: post.text,
      image: post.image,
    });
    if (post.image?.source === 'unsplash') unsplash.trackDownload(post.image.downloadLocation);
    Object.assign(post, { status: 'published', publishedAt: new Date(), externalId, externalUrl, scheduledAt: undefined });
    await post.save();
    return post;
  } catch (err) {
    post.status = 'failed';
    post.error = err.message;
    await post.save();
    const expired = err.linkedinStatus === 401 || err.tokenExpired;
    throw httpError(expired ? 400 : 502, err.message, expired ? 'SOCIAL_EXPIRED' : 'SOCIAL_PUBLISH_FAILED');
  }
}

// Cron : publie les posts programmés arrivés à échéance
async function processScheduledPosts() {
  const due = await SocialPost.find({ status: 'scheduled', scheduledAt: { $lte: new Date() } }).limit(20);
  for (const post of due) {
    try {
      await publishSocialPost(post.organizationId, post._id, post.createdBy);
      console.log(`[Social] Post ${post._id} publié`);
    } catch (e) {
      console.error(`[Social] Échec publication ${post._id} :`, e.message);
    }
  }
}

module.exports = { NETWORKS, getAccount, publicAccount, publishSocialPost, processScheduledPosts };
