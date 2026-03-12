const Investment = require('../models/Investment');
const Organization = require('../models/Organization');
const AccountingEntry = require('../models/AccountingEntry');
const { getProductsWithRates, getLatestRates } = require('../services/marketDataService');

const getUserOrg = async (userId) =>
  Organization.findOne({ $or: [{ clerkOwnerId: userId }, { 'members.clerkUserId': userId }] });

// Calcule la trésorerie disponible à partir du journal comptable
const getAvailableTreasury = async (orgId) => {
  const [credits, debits] = await Promise.all([
    AccountingEntry.aggregate([
      { $match: { organizationId: orgId, type: 'credit' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]),
    AccountingEntry.aggregate([
      { $match: { organizationId: orgId, type: 'debit' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ])
  ]);
  const totalCredits = credits[0]?.total || 0;
  const totalDebits = debits[0]?.total || 0;
  return parseFloat((totalCredits - totalDebits).toFixed(2));
};

// GET /api/investments/products — catalogue avec taux live
const getProducts = async (req, res) => {
  const products = await getProductsWithRates();
  res.json({ products });
};

// GET /api/investments/rates — snapshot brut ECB + ETFs
const getRates = async (req, res) => {
  const rates = await getLatestRates();
  res.json({ rates });
};

// GET /api/investments — portefeuille + tréso disponible
const getInvestments = async (req, res) => {
  const org = await getUserOrg(req.userId);
  if (!org) return res.status(404).json({ error: 'Organisation introuvable.' });

  const [investments, availableTreasury] = await Promise.all([
    Investment.find({ organizationId: org._id }).sort({ investedAt: -1 }).lean(),
    getAvailableTreasury(org._id)
  ]);

  // Calcul des gains virtuels
  const enriched = investments.map(inv => {
    const days = (Date.now() - new Date(inv.investedAt).getTime()) / (1000 * 60 * 60 * 24);
    const currentGain = parseFloat((inv.amount * (inv.expectedRate / 100) * (days / 365)).toFixed(2));
    const currentValue = parseFloat((inv.amount + currentGain).toFixed(2));
    return { ...inv, currentGain, currentValue };
  });

  const totalInvested = enriched.filter(i => i.status === 'active').reduce((s, i) => s + i.amount, 0);
  const totalGain = enriched.filter(i => i.status === 'active').reduce((s, i) => s + i.currentGain, 0);

  res.json({ investments: enriched, totalInvested, totalGain, availableTreasury });
};

// POST /api/investments — créer un placement
const createInvestment = async (req, res) => {
  const org = await getUserOrg(req.userId);
  if (!org) return res.status(404).json({ error: 'Organisation introuvable.' });

  const { productId, productName, amount, expectedRate, maturityDate, notes } = req.body;

  if (!productId || !amount || amount <= 0) {
    return res.status(400).json({ error: 'Produit et montant requis.' });
  }

  // Vérification de la trésorerie disponible
  const available = await getAvailableTreasury(org._id);
  if (parseFloat(amount) > available) {
    return res.status(400).json({
      error: `Fonds insuffisants. Trésorerie disponible : ${available.toFixed(2)} €`,
      availableTreasury: available
    });
  }

  const investment = await Investment.create({
    organizationId: org._id,
    productId,
    productName,
    amount: parseFloat(amount),
    expectedRate: parseFloat(expectedRate),
    maturityDate: maturityDate ? new Date(maturityDate) : undefined,
    notes
  });

  // Écriture comptable : débit "Investissement"
  await AccountingEntry.create({
    organizationId: org._id,
    date: new Date(),
    description: `Placement — ${productName}`,
    category: 'banking',
    type: 'debit',
    amount: parseFloat(amount),
    currency: org.currency || 'EUR',
    source: 'investment',
    sourceId: investment._id,
    sourceModel: 'Investment'
  });

  res.status(201).json({ investment });
};

// POST /api/investments/:id/withdraw — retirer un placement
const withdrawInvestment = async (req, res) => {
  const org = await getUserOrg(req.userId);
  if (!org) return res.status(404).json({ error: 'Organisation introuvable.' });

  const investment = await Investment.findOne({ _id: req.params.id, organizationId: org._id });
  if (!investment) return res.status(404).json({ error: 'Placement introuvable.' });
  if (investment.status !== 'active') return res.status(400).json({ error: 'Ce placement n\'est plus actif.' });

  const days = (Date.now() - investment.investedAt.getTime()) / (1000 * 60 * 60 * 24);
  const gain = parseFloat((investment.amount * (investment.expectedRate / 100) * (days / 365)).toFixed(2));
  const withdrawnAmount = parseFloat((investment.amount + gain).toFixed(2));

  investment.status = 'withdrawn';
  investment.withdrawnAt = new Date();
  investment.withdrawnAmount = withdrawnAmount;
  await investment.save();

  // Écriture comptable : crédit "Remboursement placement + intérêts"
  await AccountingEntry.create({
    organizationId: org._id,
    date: new Date(),
    description: `Retrait placement — ${investment.productName} (+${gain.toFixed(2)} €)`,
    category: 'banking',
    type: 'credit',
    amount: withdrawnAmount,
    currency: org.currency || 'EUR',
    source: 'investment',
    sourceId: investment._id,
    sourceModel: 'Investment'
  });

  res.json({ investment, gain, withdrawnAmount });
};

// DELETE /api/investments/:id — supprimer (admin)
const deleteInvestment = async (req, res) => {
  const org = await getUserOrg(req.userId);
  if (!org) return res.status(404).json({ error: 'Organisation introuvable.' });

  await Investment.findOneAndDelete({ _id: req.params.id, organizationId: org._id });
  res.json({ success: true });
};

module.exports = { getProducts, getRates, getInvestments, createInvestment, withdrawInvestment, deleteInvestment };
