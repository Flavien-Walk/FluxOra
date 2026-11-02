const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

jest.mock('../middleware/auth', () => ({
  requireAuth: (req, res, next) => {
    req.userId = 'user123';
    next();
  },
}));
jest.mock('../services/social/safeUrl', () => ({
  assertPublicHttpsUrl: async (raw) => new URL(raw),
}));

process.env.SOCIAL_TOKEN_SECRET = 'test-secret';
process.env.INSTAGRAM_CLIENT_ID = 'ig-client';
process.env.INSTAGRAM_CLIENT_SECRET = 'ig-secret';
process.env.INSTAGRAM_REDIRECT_URI = 'https://api.test/api/social/instagram/callback';
process.env.CLIENT_URL = 'https://app.test';

const Organization = require('../models/Organization');
const SocialAccount = require('../models/SocialAccount');
const SocialPost = require('../models/SocialPost');
const { router, publicRouter } = require('./social');
const instagram = require('../services/social/instagramService');
const { encrypt, decrypt, signState } = require('../services/social/socialCrypto');

const app = express();
app.use(express.json());
app.use('/api/social', publicRouter);
app.use('/api/social', router);

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const jpeg = () => new Response(Buffer.from('jpeg'), { status: 200, headers: { 'Content-Type': 'image/jpeg' } });

const IMAGE = { url: 'https://cdn.test/photo.jpg', source: 'url', alt: 'Une photo' };
const FUTURE = () => new Date(Date.now() + 30 * 86400000);

let mongoServer;
let org;
let calls;

// Simule l'API de Meta : chaque test peut remplacer une réponse selon l'URL
const mockFetch = (overrides = {}) => {
  calls = [];
  global.fetch = jest.fn(async (input, init = {}) => {
    const url = String(input);
    calls.push({ url, init });
    for (const [pattern, handler] of Object.entries(overrides)) {
      if (url.includes(pattern)) return handler(url, init);
    }
    if (url.startsWith('https://api.instagram.com/oauth/access_token')) {
      return json({ data: [{ access_token: 'short', user_id: '42', permissions: 'instagram_business_basic,instagram_business_content_publish' }] });
    }
    if (url.includes('/access_token?')) return json({ access_token: 'long', token_type: 'bearer', expires_in: 5184000 });
    if (url.includes('/refresh_access_token?')) return json({ access_token: 'refreshed', token_type: 'bearer', expires_in: 5184000 });
    if (url.includes('/me?')) return json({ user_id: '1784', username: 'fluxora', account_type: 'BUSINESS', profile_picture_url: 'https://cdn.test/me.jpg' });
    if (url.endsWith('/me/media')) return json({ id: 'container1' });
    if (url.includes('/container1?')) return json({ status_code: 'FINISHED' });
    if (url.endsWith('/me/media_publish')) return json({ id: 'media1' });
    if (url.includes('/media1?')) return json({ permalink: 'https://www.instagram.com/p/abc/' });
    if (url.startsWith('https://cdn.test/') || url.startsWith('https://images.unsplash.com/')) return jpeg();
    throw new Error(`Appel inattendu : ${url}`);
  });
};

const connectAccount = (fields = {}) => SocialAccount.create({
  organizationId: org._id,
  clerkUserId: 'user123',
  network: 'instagram',
  externalId: '1784',
  name: 'fluxora',
  accessToken: encrypt('token'),
  expiresAt: FUTURE(),
  ...fields,
});

const createPost = (fields = {}) => SocialPost.create({
  organizationId: org._id,
  createdBy: 'user123',
  network: 'instagram',
  text: 'Ma légende',
  image: IMAGE,
  ...fields,
});

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Promise.all([Organization.deleteMany({}), SocialAccount.deleteMany({}), SocialPost.deleteMany({})]);
  org = await Organization.create({ name: 'Test Corp', clerkOwnerId: 'user123' });
  mockFetch();
});

describe('Connexion Instagram', () => {
  it('indique le statut et l\'URL de connexion avec les bons scopes', async () => {
    const status = await request(app).get('/api/social/status');
    expect(status.body.instagram).toEqual({ configured: true, account: null });

    const res = await request(app).get('/api/social/instagram/connect');
    const url = new URL(res.body.url);
    expect(url.origin + url.pathname).toBe('https://www.instagram.com/oauth/authorize');
    expect(url.searchParams.get('scope')).toBe('instagram_business_basic,instagram_business_content_publish');
    expect(url.searchParams.get('state')).toBeTruthy();
  });

  it('enregistre le compte avec un jeton longue durée chiffré', async () => {
    const state = signState({ u: 'user123', o: String(org._id) });
    const res = await request(app).get(`/api/social/instagram/callback?code=abc&state=${encodeURIComponent(state)}`);

    expect(res.headers.location).toBe('https://app.test/communication?instagram=connected');
    const acc = await SocialAccount.findOne({ network: 'instagram' });
    expect(acc.externalId).toBe('1784');
    expect(acc.name).toBe('fluxora');
    expect(acc.accessToken).not.toContain('long');
    expect(decrypt(acc.accessToken)).toBe('long');
    expect(acc.expiresAt.getTime()).toBeGreaterThan(Date.now() + 59 * 86400000);
  });

  it('refuse un compte personnel', async () => {
    mockFetch({ '/me?': () => json({ user_id: '1', username: 'perso', account_type: 'PERSONAL' }) });
    const state = signState({ u: 'user123', o: String(org._id) });
    const res = await request(app).get(`/api/social/instagram/callback?code=abc&state=${encodeURIComponent(state)}`);

    expect(res.headers.location).toContain('instagram=error');
    expect(await SocialAccount.countDocuments({ network: 'instagram' })).toBe(0);
  });

  it('refuse un state invalide sans appeler Instagram', async () => {
    const res = await request(app).get('/api/social/instagram/callback?code=abc&state=faux.faux');
    expect(res.headers.location).toContain('instagram=error');
    expect(calls).toHaveLength(0);
  });

  it('déconnecte uniquement Instagram', async () => {
    await connectAccount();
    await SocialAccount.create({ organizationId: org._id, clerkUserId: 'user123', network: 'linkedin', externalId: 'li', accessToken: encrypt('x') });
    await request(app).delete('/api/social/instagram');
    expect((await SocialAccount.find()).map((a) => a.network)).toEqual(['linkedin']);
  });
});

describe('Publication Instagram', () => {
  it('crée le conteneur, attend le traitement puis publie', async () => {
    await connectAccount();
    const post = await createPost();
    const res = await request(app).post(`/api/social/posts/${post._id}/publish`);

    expect(res.statusCode).toBe(200);
    expect(res.body.post.status).toBe('published');
    expect(res.body.post.externalId).toBe('media1');
    expect(res.body.post.externalUrl).toBe('https://www.instagram.com/p/abc/');

    const media = calls.find((c) => c.url.endsWith('/me/media'));
    expect(JSON.parse(media.init.body)).toEqual({ image_url: IMAGE.url, caption: 'Ma légende', alt_text: 'Une photo' });
    expect(media.init.headers.Authorization).toBe('Bearer token');
    const publish = calls.find((c) => c.url.endsWith('/me/media_publish'));
    expect(JSON.parse(publish.init.body)).toEqual({ creation_id: 'container1' });
  });

  it('demande les photos Unsplash en JPEG au bon ratio', async () => {
    await connectAccount();
    const post = await createPost({ image: { url: 'https://images.unsplash.com/photo-1?fm=webp&q=80', source: 'url' } });
    await request(app).post(`/api/social/posts/${post._id}/publish`);

    const { image_url: imageUrl } = JSON.parse(calls.find((c) => c.url.endsWith('/me/media')).init.body);
    const params = new URL(imageUrl).searchParams;
    expect(params.get('fm')).toBe('jpg');
    expect(params.get('q')).toBe('80');
    expect(`${params.get('w')}x${params.get('h')}`).toBe('1080x810');
  });

  it('exige une image', async () => {
    await connectAccount();
    const post = await createPost({ image: undefined });
    const res = await request(app).post(`/api/social/posts/${post._id}/publish`);
    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe('SOCIAL_IMAGE_REQUIRED');
    expect(calls).toHaveLength(0);
  });

  it('refuse une légende de plus de 2200 caractères', async () => {
    await connectAccount();
    const post = await createPost({ text: 'a'.repeat(2201) });
    const res = await request(app).post(`/api/social/posts/${post._id}/publish`);
    expect(res.statusCode).toBe(400);
    expect(calls).toHaveLength(0);
  });

  it('refuse une image non JPEG avant d\'appeler Instagram', async () => {
    await connectAccount();
    mockFetch({ 'cdn.test': () => new Response('x', { status: 200, headers: { 'Content-Type': 'image/png' } }) });
    const post = await createPost();
    const res = await request(app).post(`/api/social/posts/${post._id}/publish`);

    expect(res.statusCode).toBe(502);
    expect(res.body.error).toContain('JPEG');
    expect(calls.some((c) => c.url.endsWith('/me/media'))).toBe(false);
    expect((await SocialPost.findById(post._id)).status).toBe('failed');
  });

  it('marque le post en échec si Instagram rejette le média', async () => {
    await connectAccount();
    mockFetch({ '/container1?': () => json({ status_code: 'ERROR' }) });
    const post = await createPost();
    const res = await request(app).post(`/api/social/posts/${post._id}/publish`);

    expect(res.statusCode).toBe(502);
    expect(calls.some((c) => c.url.endsWith('/me/media_publish'))).toBe(false);
    expect((await SocialPost.findById(post._id)).status).toBe('failed');
  });

  it('signale un jeton expiré', async () => {
    await connectAccount();
    mockFetch({ '/me/media': () => json({ error: { message: 'Invalid OAuth access token', code: 190 } }, 400) });
    const post = await createPost();
    const res = await request(app).post(`/api/social/posts/${post._id}/publish`);
    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe('SOCIAL_EXPIRED');
  });

  it('reste publié si le lien du post est introuvable', async () => {
    await connectAccount();
    mockFetch({ '/media1?': () => json({ error: { message: 'x' } }, 500) });
    const post = await createPost();
    const res = await request(app).post(`/api/social/posts/${post._id}/publish`);
    expect(res.statusCode).toBe(200);
    expect(res.body.post.status).toBe('published');
    expect(res.body.post.externalUrl).toBeFalsy();
  });

  it('renouvelle un jeton proche de l\'expiration', async () => {
    await connectAccount({ expiresAt: new Date(Date.now() + 86400000) });
    await SocialAccount.collection.updateOne({ network: 'instagram' }, { $set: { updatedAt: new Date(Date.now() - 2 * 86400000) } });
    const post = await createPost();
    await request(app).post(`/api/social/posts/${post._id}/publish`);

    const media = calls.find((c) => c.url.endsWith('/me/media'));
    expect(media.init.headers.Authorization).toBe('Bearer refreshed');
    expect(decrypt((await SocialAccount.findOne({ network: 'instagram' })).accessToken)).toBe('refreshed');
  });

  it('attend tant que le conteneur est en cours de traitement', async () => {
    let checks = 0;
    mockFetch({ '/container1?': () => { checks += 1; return json({ status_code: checks < 2 ? 'IN_PROGRESS' : 'FINISHED' }); } });
    const result = await instagram.publishPost({ accessToken: 't', text: 'x', image: IMAGE, pollMs: 0 });
    expect(checks).toBe(2);
    expect(result.externalId).toBe('media1');
  });
});

describe('Posts par réseau', () => {
  it('crée un post Instagram et limite la légende à 2200 caractères', async () => {
    const res = await request(app).post('/api/social/posts').send({ network: 'instagram', text: 'a'.repeat(2500), image: IMAGE });
    expect(res.statusCode).toBe(201);
    expect(res.body.post.network).toBe('instagram');
    expect(res.body.post.text).toHaveLength(2200);
  });

  it('garde LinkedIn par défaut et refuse un réseau inconnu', async () => {
    const res = await request(app).post('/api/social/posts').send({ text: 'Bonjour' });
    expect(res.body.post.network).toBe('linkedin');
    expect((await request(app).post('/api/social/posts').send({ network: 'tiktok', text: 'x' })).statusCode).toBe(400);
  });

  it('refuse de programmer sans image ou sans compte', async () => {
    const noImage = await createPost({ image: undefined });
    await connectAccount();
    const res = await request(app).patch(`/api/social/posts/${noImage._id}`).send({ scheduledAt: FUTURE().toISOString() });
    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe('SOCIAL_IMAGE_REQUIRED');

    await SocialAccount.deleteMany({});
    const post = await createPost();
    const res2 = await request(app).patch(`/api/social/posts/${post._id}`).send({ scheduledAt: FUTURE().toISOString() });
    expect(res2.statusCode).toBe(400);
    expect(res2.body.code).toBe('SOCIAL_NOT_CONNECTED');
  });

  it('refuse de retirer l\'image d\'un post programmé', async () => {
    const post = await createPost({ status: 'scheduled', scheduledAt: FUTURE() });
    const res = await request(app).patch(`/api/social/posts/${post._id}`).send({ image: null });
    expect(res.statusCode).toBe(400);
    expect((await SocialPost.findById(post._id)).image.url).toBe(IMAGE.url);
  });

  it('permet de changer le réseau d\'un brouillon, pas d\'un post programmé', async () => {
    const draft = await createPost({ network: 'linkedin' });
    const ok = await request(app).patch(`/api/social/posts/${draft._id}`).send({ network: 'instagram' });
    expect(ok.body.post.network).toBe('instagram');

    const scheduled = await createPost({ status: 'scheduled', scheduledAt: FUTURE() });
    const ko = await request(app).patch(`/api/social/posts/${scheduled._id}`).send({ network: 'linkedin' });
    expect(ko.statusCode).toBe(409);
  });
});
