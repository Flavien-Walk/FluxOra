const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const {
  createOrganization,
  getMyOrganization,
  updateOrganization,
  addMember,
  removeMember,
} = require('../controllers/organizationController');

router.get('/me', requireAuth, getMyOrganization);
router.post('/', requireAuth, createOrganization);
router.put('/:id', requireAuth, updateOrganization);
router.post('/:id/members', requireAuth, addMember);
router.delete('/:id/members/:clerkUserId', requireAuth, removeMember);

module.exports = router;
