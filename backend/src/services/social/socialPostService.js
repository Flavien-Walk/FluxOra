/**
 * Logique partagée des posts sociaux : publication (route, agent IA, cron) et programmation.
 */
const SocialPost    = require('../../models/SocialPost');
const SocialAccount = require('../../models/SocialAccount');
const linkedin      = require('./linkedinService');
const unsplash      = require('./unsplashService');
const { decrypt }   = require('./socialCrypto');

const httpError = (status, message, code) => Object.assign(new Error(message), { status, code });

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

/**
 * Publie un post sur LinkedIn avec le compte de son auteur.
 * Met à jour le statut (published / failed) et renvoie le post.
 */
async function publishSocialPost(orgId, postId, clerkUserId) {
  const post = await SocialPost.findOne({ _id: postId, organizationId: orgId });
  if (!post) throw httpError(404, 'Post introuvable.');
  if (post.status === 'published') throw httpError(409, 'Ce post est déjà publié.');
  if (!post.text?.trim() && !post.image?.url) throw httpError(400, 'Le post est vide.');

  const acc = await getAccount(orgId, clerkUserId || post.createdBy, post.network);
  if (!acc) throw httpError(400, 'Aucun compte LinkedIn connecté.', 'SOCIAL_NOT_CONNECTED');
  if (acc.expiresAt && acc.expiresAt < new Date()) throw httpError(400, 'La connexion LinkedIn a expiré — reconnectez votre compte.', 'SOCIAL_EXPIRED');

  post.status = 'publishing';
  post.error = undefined;
  await post.save();

  try {
    const { externalId, externalUrl } = await linkedin.publishPost({
      accessToken: decrypt(acc.accessToken),
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
    throw httpError(err.linkedinStatus === 401 ? 400 : 502, err.message, err.linkedinStatus === 401 ? 'SOCIAL_EXPIRED' : 'SOCIAL_PUBLISH_FAILED');
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

module.exports = { getAccount, publicAccount, publishSocialPost, processScheduledPosts };
