const Investment = require('../models/Investment');

/* Catalogue des produits disponibles */
const PRODUCTS = [
  {
    id: 'livret-pro',
    name: 'Livret Pro',
    rate: 3.0,
    minAmount: 100,
    maxAmount: 150000,
    liquidity: 'Immédiate',
    riskLevel: 'low',
    description: 'Épargne disponible à tout moment, rémunérée au taux réglementé.',
    category: 'epargne',
  },
  {
    id: 'compte-terme-3m',
    name: 'Compte à terme 3 mois',
    rate: 4.2,
    minAmount: 5000,
    maxAmount: null,
    liquidity: '3 mois',
    riskLevel: 'low',
    description: 'Placement bloqué 3 mois, taux garanti à la souscription.',
    category: 'terme',
    durationMonths: 3,
  },
  {
    id: 'compte-terme-6m',
    name: 'Compte à terme 6 mois',
    rate: 4.8,
    minAmount: 5000,
    maxAmount: null,
    liquidity: '6 mois',
    riskLevel: 'low',
    description: 'Placement bloqué 6 mois, taux garanti à la souscription.',
    category: 'terme',
    durationMonths: 6,
  },
  {
    id: 'fonds-monetaire',
    name: 'Fonds monétaire',
    rate: 3.8,
    minAmount: 1000,
    maxAmount: null,
    liquidity: '48h',
    riskLevel: 'low',
    description: 'OPCVM monétaire, capital non garanti mais risque très faible.',
    category: 'fonds',
  },
];

/* Calcule les gains accumulés depuis startDate jusqu'à maintenant */
function computeGain(amount, rate, startDate) {
  const now = new Date();
  const start = new Date(startDate);
  const years = Math.max(0, (now - start) / (1000 * 60 * 60 * 24 * 365));
  return parseFloat(((amount * rate) / 100 * years).toFixed(2));
}

/* GET /api/investments */
exports.getInvestments = async (req, res) => {
  const organizationId = req.auth.orgId || req.auth.userId;
  const investments = await Investment.find({ organizationId }).sort({ createdAt: -1 });

  // Enrichit chaque placement avec le gain courant
  const enriched = investments.map((inv) => {
    const obj = inv.toObject();
    if (inv.status === 'active') {
      obj.gainAccrued = computeGain(inv.amount, inv.rate, inv.startDate);
    }
    return obj;
  });

  const active = enriched.filter((i) => i.status === 'active');
  const totalInvested = active.reduce((sum, i) => sum + i.amount, 0);
  const totalGain = active.reduce((sum, i) => sum + i.gainAccrued, 0);

  // availableTreasury : sera fourni par le frontend (solde du compte)
  // On renvoie null pour indiquer au frontend de l'injecter lui-même
  res.json({ investments: enriched, totalInvested, totalGain, availableTreasury: null });
};

/* GET /api/investments/products */
exports.getProducts = async (req, res) => {
  res.json({ products: PRODUCTS });
};

/* POST /api/investments — créer un placement */
exports.createInvestment = async (req, res) => {
  const organizationId = req.auth.orgId || req.auth.userId;
  const { productId, amount, notes } = req.body;

  if (!productId || !amount) {
    return res.status(400).json({ error: 'productId et amount sont requis.' });
  }

  const product = PRODUCTS.find((p) => p.id === productId);
  if (!product) return res.status(400).json({ error: 'Produit inconnu.' });

  if (amount < product.minAmount) {
    return res.status(400).json({ error: `Montant minimum : ${product.minAmount} €` });
  }
  if (product.maxAmount && amount > product.maxAmount) {
    return res.status(400).json({ error: `Montant maximum : ${product.maxAmount} €` });
  }

  const startDate = new Date();
  let maturityDate = null;
  if (product.durationMonths) {
    maturityDate = new Date(startDate);
    maturityDate.setMonth(maturityDate.getMonth() + product.durationMonths);
  }

  const investment = await Investment.create({
    organizationId,
    productId: product.id,
    productName: product.name,
    amount,
    rate: product.rate,
    startDate,
    maturityDate,
    notes,
  });

  res.status(201).json({ investment });
};

/* POST /api/investments/:id/withdraw */
exports.withdraw = async (req, res) => {
  const organizationId = req.auth.orgId || req.auth.userId;
  const investment = await Investment.findOne({ _id: req.params.id, organizationId });

  if (!investment) return res.status(404).json({ error: 'Placement introuvable.' });
  if (investment.status !== 'active') {
    return res.status(400).json({ error: 'Ce placement est déjà clôturé.' });
  }

  investment.gainAccrued = computeGain(investment.amount, investment.rate, investment.startDate);
  investment.status = 'withdrawn';
  investment.withdrawnAt = new Date();
  await investment.save();

  res.json({ investment });
};
