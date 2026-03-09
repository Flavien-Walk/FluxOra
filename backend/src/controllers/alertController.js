const Alert = require('../models/Alert');
const Organization = require('../models/Organization');

const getUserOrg = async (userId) =>
  Organization.findOne({
    $or: [{ clerkOwnerId: userId }, { 'members.clerkUserId': userId }],
  });

// GET /api/alerts
const getAlerts = async (req, res) => {
  const org = await getUserOrg(req.userId);
  if (!org) return res.status(404).json({ error: 'Organisation introuvable.' });

  const { status = 'open' } = req.query;
  const query = { organizationId: org._id };
  if (status !== 'all') query.status = status;

  const alerts = await Alert.find(query)
    .populate('expenseId', 'description amount date vendor')
    .sort({ createdAt: -1 });

  const openCount = await Alert.countDocuments({ organizationId: org._id, status: 'open' });

  res.json({ alerts, openCount });
};

// PATCH /api/alerts/:id/resolve
const resolveAlert = async (req, res) => {
  const org = await getUserOrg(req.userId);
  if (!org) return res.status(404).json({ error: 'Organisation introuvable.' });

  const alert = await Alert.findOneAndUpdate(
    { _id: req.params.id, organizationId: org._id },
    { status: 'resolved', resolvedAt: new Date(), resolvedBy: req.userId },
    { new: true }
  );
  if (!alert) return res.status(404).json({ error: 'Alerte introuvable.' });

  res.json(alert);
};

module.exports = { getAlerts, resolveAlert };
