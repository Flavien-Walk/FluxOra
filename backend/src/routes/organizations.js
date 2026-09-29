const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const {
  createOrganization,
  getMyOrganization,
  updateOrganization,
  addMember,
  removeMember,
  exportMyData,
  deleteMyOrganization,
} = require('../controllers/organizationController');

router.get('/me', requireAuth, getMyOrganization);
router.get('/me/export', requireAuth, exportMyData);

// Membres : liste lisible, invitations, rôles
const members = require('../controllers/memberController');
router.get('/me/members', requireAuth, members.listMembers);
router.post('/me/members/invite', requireAuth, members.inviteMember);
router.patch('/me/members/:clerkUserId', requireAuth, members.updateMemberRole);
router.delete('/me/members/:clerkUserId', requireAuth, members.removeMember);
router.delete('/me/invites/:email', requireAuth, members.cancelInvite);
router.delete('/me', requireAuth, deleteMyOrganization);
router.post('/', requireAuth, createOrganization);
router.put('/:id', requireAuth, updateOrganization);
router.post('/:id/members', requireAuth, addMember);
router.delete('/:id/members/:clerkUserId', requireAuth, removeMember);

module.exports = router;
