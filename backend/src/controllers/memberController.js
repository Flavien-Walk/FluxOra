/**
 * Membres de l'organisation : liste lisible (nom, email), invitations par email, rôles.
 * Un utilisateur n'appartient qu'à une seule organisation Fluxora.
 */
const { clerkClient } = require('@clerk/express');
const Organization = require('../models/Organization');

const ROLES = ['viewer', 'manager', 'finance', 'admin'];
const ROLE_LABELS = { viewer: 'Lecteur', manager: 'Manager', finance: 'Finance', admin: 'Administrateur' };

const findOrg = (userId) =>
  Organization.findOne({ $or: [{ clerkOwnerId: userId }, { 'members.clerkUserId': userId }] });

const isAdmin = (org, userId) =>
  org.clerkOwnerId === userId || org.members.some((m) => m.clerkUserId === userId && m.role === 'admin');

const normEmail = (e) => String(e || '').trim().toLowerCase();

async function clerkUsersByIds(ids) {
  if (!ids.length) return new Map();
  try {
    const res = await clerkClient.users.getUserList({ userId: ids, limit: 100 });
    const list = Array.isArray(res) ? res : res.data || [];
    return new Map(list.map((u) => [u.id, u]));
  } catch (err) {
    console.error('[Membres] Clerk :', err.message);
    return new Map();
  }
}

const primaryEmail = (u) => u?.emailAddresses?.find((e) => e.id === u.primaryEmailAddressId)?.emailAddress || u?.emailAddresses?.[0]?.emailAddress || null;

// GET /api/organizations/me/members
const listMembers = async (req, res) => {
  const org = await findOrg(req.userId);
  if (!org) return res.status(404).json({ error: 'Organisation introuvable.' });
  const ids = [...new Set([org.clerkOwnerId, ...org.members.map((m) => m.clerkUserId)])];
  const users = await clerkUsersByIds(ids);
  const members = ids.map((id) => {
    const u = users.get(id);
    const role = id === org.clerkOwnerId ? 'admin' : org.members.find((m) => m.clerkUserId === id)?.role || 'viewer';
    return {
      clerkUserId: id,
      name: [u?.firstName, u?.lastName].filter(Boolean).join(' ') || u?.username || null,
      email: primaryEmail(u),
      imageUrl: u?.imageUrl || null,
      role,
      roleLabel: ROLE_LABELS[role],
      isOwner: id === org.clerkOwnerId,
      isMe: id === req.userId,
    };
  });
  res.json({ members, invites: org.invites || [], canManage: isAdmin(org, req.userId), roles: ROLES.map((r) => ({ id: r, label: ROLE_LABELS[r] })) });
};

// POST /api/organizations/me/members/invite { email, role }
const inviteMember = async (req, res) => {
  const org = await findOrg(req.userId);
  if (!org) return res.status(404).json({ error: 'Organisation introuvable.' });
  if (!isAdmin(org, req.userId)) return res.status(403).json({ error: 'Réservé aux administrateurs.' });
  const email = normEmail(req.body?.email);
  const role = ROLES.includes(req.body?.role) ? req.body.role : 'viewer';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Adresse email invalide.' });
  if ((org.invites || []).some((i) => i.email === email)) return res.status(409).json({ error: 'Une invitation est déjà en attente pour cette adresse.' });

  // Compte Fluxora existant : ajout immédiat (s'il n'appartient pas déjà à une organisation)
  let existing = null;
  try {
    const r = await clerkClient.users.getUserList({ emailAddress: [email], limit: 1 });
    existing = (Array.isArray(r) ? r : r.data || [])[0] || null;
  } catch (err) { console.error('[Membres] Clerk :', err.message); }

  if (existing) {
    if (org.clerkOwnerId === existing.id || org.members.some((m) => m.clerkUserId === existing.id)) {
      return res.status(409).json({ error: 'Cette personne fait déjà partie de l’organisation.' });
    }
    const other = await findOrg(existing.id);
    if (other) return res.status(409).json({ error: 'Cette personne appartient déjà à une autre organisation Fluxora.' });
    org.members.push({ clerkUserId: existing.id, role });
    await org.save();
    return res.status(201).json({ added: true, message: 'Membre ajouté.' });
  }

  // Sinon : invitation en attente, rattachée automatiquement à la première connexion
  org.invites = [...(org.invites || []), { email, role, invitedAt: new Date(), invitedBy: req.userId }];
  await org.save();
  let emailSent = false;
  try {
    const { sendInvitationEmail } = require('../services/emailService');
    await sendInvitationEmail({ org, email, roleLabel: ROLE_LABELS[role] });
    emailSent = true;
  } catch (err) { console.error('[Membres] invitation :', err.message); }
  res.status(201).json({ invited: true, emailSent, message: emailSent ? 'Invitation envoyée par email.' : 'Invitation enregistrée (email non envoyé : partagez le lien d’inscription).' });
};

// PATCH /api/organizations/me/members/:clerkUserId { role }
const updateMemberRole = async (req, res) => {
  const org = await findOrg(req.userId);
  if (!org) return res.status(404).json({ error: 'Organisation introuvable.' });
  if (!isAdmin(org, req.userId)) return res.status(403).json({ error: 'Réservé aux administrateurs.' });
  const { clerkUserId } = req.params;
  if (clerkUserId === org.clerkOwnerId) return res.status(400).json({ error: 'Le propriétaire reste administrateur.' });
  const role = req.body?.role;
  if (!ROLES.includes(role)) return res.status(400).json({ error: 'Rôle invalide.' });
  const member = org.members.find((m) => m.clerkUserId === clerkUserId);
  if (!member) return res.status(404).json({ error: 'Membre introuvable.' });
  member.role = role;
  await org.save();
  res.json({ ok: true });
};

// DELETE /api/organizations/me/members/:clerkUserId
const removeMember = async (req, res) => {
  const org = await findOrg(req.userId);
  if (!org) return res.status(404).json({ error: 'Organisation introuvable.' });
  if (!isAdmin(org, req.userId)) return res.status(403).json({ error: 'Réservé aux administrateurs.' });
  if (req.params.clerkUserId === org.clerkOwnerId) return res.status(400).json({ error: 'Le propriétaire ne peut pas être retiré.' });
  org.members = org.members.filter((m) => m.clerkUserId !== req.params.clerkUserId);
  await org.save();
  res.json({ ok: true });
};

// DELETE /api/organizations/me/invites/:email
const cancelInvite = async (req, res) => {
  const org = await findOrg(req.userId);
  if (!org) return res.status(404).json({ error: 'Organisation introuvable.' });
  if (!isAdmin(org, req.userId)) return res.status(403).json({ error: 'Réservé aux administrateurs.' });
  const email = normEmail(req.params.email);
  org.invites = (org.invites || []).filter((i) => i.email !== email);
  await org.save();
  res.json({ ok: true });
};

/**
 * À la première connexion d'un invité (aucune organisation) : rattachement à l'organisation qui l'a invité.
 * @returns l'organisation rejointe, ou null
 */
async function acceptPendingInvite(userId) {
  let user;
  try { user = await clerkClient.users.getUser(userId); } catch { return null; }
  const emails = (user?.emailAddresses || []).filter((e) => e.verification?.status === 'verified' || !e.verification).map((e) => normEmail(e.emailAddress));
  if (!emails.length) return null;
  const org = await Organization.findOne({ 'invites.email': { $in: emails } });
  if (!org) return null;
  const invite = org.invites.find((i) => emails.includes(i.email));
  org.members.push({ clerkUserId: userId, role: invite.role || 'viewer' });
  org.invites = org.invites.filter((i) => i.email !== invite.email);
  await org.save();
  return org;
}

module.exports = { listMembers, inviteMember, updateMemberRole, removeMember, cancelInvite, acceptPendingInvite, findOrg };
