const Transfer      = require('../models/Transfer');
const Beneficiary   = require('../models/Beneficiary');
const AccountingEntry = require('../models/AccountingEntry');
const Organization  = require('../models/Organization');

const getUserOrg = async (userId) =>
  Organization.findOne({
    $or: [{ clerkOwnerId: userId }, { 'members.clerkUserId': userId }],
  });

// ─── Bénéficiaires ────────────────────────────────────────────────────────────

const getBeneficiaries = async (req, res) => {
  const org = await getUserOrg(req.userId);
  if (!org) return res.status(404).json({ error: 'Organisation introuvable.' });

  const beneficiaries = await Beneficiary.find({ organizationId: org._id }).sort({ name: 1 });
  res.json({ beneficiaries });
};

const createBeneficiary = async (req, res) => {
  const org = await getUserOrg(req.userId);
  if (!org) return res.status(404).json({ error: 'Organisation introuvable.' });

  const { name, iban, bic, email } = req.body;
  const beneficiary = await Beneficiary.create({
    organizationId: org._id,
    name,
    iban: iban.replace(/\s/g, '').toUpperCase(),
    bic:  bic  ? bic.replace(/\s/g, '').toUpperCase() : undefined,
    email,
    isVerified: true, // simulation — pas de vérification bancaire réelle
  });

  res.status(201).json(beneficiary);
};

const deleteBeneficiary = async (req, res) => {
  const org = await getUserOrg(req.userId);
  if (!org) return res.status(404).json({ error: 'Organisation introuvable.' });

  await Beneficiary.findOneAndDelete({ _id: req.params.id, organizationId: org._id });
  res.json({ message: 'Bénéficiaire supprimé.' });
};

// ─── Virements ────────────────────────────────────────────────────────────────

const getTransfers = async (req, res) => {
  const org = await getUserOrg(req.userId);
  if (!org) return res.status(404).json({ error: 'Organisation introuvable.' });

  const { page = 1, limit = 20 } = req.query;
  const [transfers, total] = await Promise.all([
    Transfer.find({ organizationId: org._id })
      .populate('beneficiaryId', 'name iban')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit)),
    Transfer.countDocuments({ organizationId: org._id }),
  ]);

  res.json({ transfers, total });
};

const createTransfer = async (req, res) => {
  const org = await getUserOrg(req.userId);
  if (!org) return res.status(404).json({ error: 'Organisation introuvable.' });

  const { beneficiaryId, amount, reference } = req.body;

  const beneficiary = await Beneficiary.findOne({ _id: beneficiaryId, organizationId: org._id });
  if (!beneficiary) return res.status(404).json({ error: 'Bénéficiaire introuvable.' });

  // Création du virement en statut "processing"
  const transfer = await Transfer.create({
    organizationId: org._id,
    beneficiaryId,
    amount:      Number(amount),
    reference:   reference || `Virement vers ${beneficiary.name}`,
    status:      'processing',
    initiatedBy: req.userId,
  });

  // Écriture comptable immédiate
  const entry = await AccountingEntry.create({
    organizationId: org._id,
    date:        new Date(),
    description: reference || `Virement vers ${beneficiary.name}`,
    category:    'suppliers',
    type:        'debit',
    amount:      Number(amount),
    currency:    'EUR',
    source:      'manual',
    sourceId:    transfer._id,
  });

  await Transfer.findByIdAndUpdate(transfer._id, { accountingEntryId: entry._id });

  // Simulation : passage en "completed" après 2 secondes (en arrière-plan)
  setTimeout(async () => {
    try {
      await Transfer.findByIdAndUpdate(transfer._id, {
        status:     'completed',
        executedAt: new Date(),
      });
    } catch { /* silencieux */ }
  }, 2000);

  const populated = await Transfer.findById(transfer._id).populate('beneficiaryId', 'name iban');
  res.status(201).json(populated);
};

const cancelTransfer = async (req, res) => {
  const org = await getUserOrg(req.userId);
  if (!org) return res.status(404).json({ error: 'Organisation introuvable.' });

  const transfer = await Transfer.findOne({ _id: req.params.id, organizationId: org._id });
  if (!transfer) return res.status(404).json({ error: 'Virement introuvable.' });
  if (transfer.status !== 'processing') {
    return res.status(400).json({ error: 'Seuls les virements en traitement peuvent être annulés.' });
  }

  transfer.status = 'cancelled';
  await transfer.save();

  // Supprime l'écriture comptable associée
  if (transfer.accountingEntryId) {
    await AccountingEntry.findByIdAndDelete(transfer.accountingEntryId);
  }

  res.json(transfer);
};

module.exports = {
  getBeneficiaries, createBeneficiary, deleteBeneficiary,
  getTransfers, createTransfer, cancelTransfer,
};
