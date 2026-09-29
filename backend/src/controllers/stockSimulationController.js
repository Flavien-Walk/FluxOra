/**
 * Simulation d'investissement en actions (Euronext Paris / Growth).
 * Aucun ordre n'est transmis à un courtier et aucune écriture comptable n'est créée :
 * les positions servent uniquement à simuler un portefeuille au cours différé de 15 minutes.
 */
const Organization = require('../models/Organization');
const SimulatedPosition = require('../models/SimulatedPosition');
const equities = require('../services/market/equitiesService');

// Frais de courtage simulés : 0,1 % du montant, minimum 1 €
const FEE_RATE = 0.001;
const FEE_MIN = 1;
const MAX_ORDER_EUR = 10_000_000;

const round2 = (n) => Math.round(n * 100) / 100;
const fees = (amountEur) => round2(Math.max(amountEur * FEE_RATE, FEE_MIN));

const getUserOrg = (userId) =>
  Organization.findOne({ $or: [{ clerkOwnerId: userId }, { 'members.clerkUserId': userId }] });

// Valorise une position au dernier cours connu
function valuePosition(pos, live) {
  const priceEur = live?.priceEur ?? null;
  if (pos.status === 'sold') {
    return { ...pos, currentPriceEur: pos.sellPriceEur, valueEur: pos.proceedsEur, pnlEur: pos.realizedPnlEur,
      pnlPercent: round2((pos.realizedPnlEur / pos.investedEur) * 100) };
  }
  const valueEur = priceEur != null ? round2(pos.quantity * priceEur) : null;
  const pnlEur = valueEur != null ? round2(valueEur - pos.investedEur) : null;
  return {
    ...pos,
    currentPrice: live?.price ?? null,
    currentPriceEur: priceEur,
    changePercentToday: live?.changePercent ?? null,
    quoteTime: live?.time ?? null,
    valueEur,
    pnlEur,
    pnlPercent: pnlEur != null ? round2((pnlEur / pos.investedEur) * 100) : null,
  };
}

// GET /api/investments/stocks — portefeuille simulé valorisé
const getPortfolio = async (req, res) => {
  const org = await getUserOrg(req.userId);
  if (!org) return res.status(404).json({ error: 'Organisation introuvable.' });
  const positions = await SimulatedPosition.find({ organizationId: org._id }).sort({ boughtAt: -1 }).lean();

  const lives = new Map();
  await Promise.all([...new Set(positions.filter((p) => p.status === 'open').map((p) => p.isin))].map(async (isin) => {
    try { lives.set(isin, await equities.findStock(isin)); } catch { /* cours indisponible */ }
  }));

  const valued = positions.map((p) => valuePosition(p, lives.get(p.isin)));
  const open = valued.filter((p) => p.status === 'open');
  const investedEur = round2(open.reduce((s, p) => s + p.investedEur, 0));
  const valueEur = round2(open.reduce((s, p) => s + (p.valueEur ?? p.investedEur), 0));
  const realizedPnlEur = round2(valued.filter((p) => p.status === 'sold').reduce((s, p) => s + (p.realizedPnlEur || 0), 0));

  res.json({
    positions: valued,
    totals: {
      investedEur,
      valueEur,
      unrealizedPnlEur: round2(valueEur - investedEur),
      unrealizedPnlPercent: investedEur ? round2(((valueEur - investedEur) / investedEur) * 100) : 0,
      realizedPnlEur,
    },
    fees: { rate: FEE_RATE, min: FEE_MIN },
  });
};

const httpError = (status, message) => Object.assign(new Error(message), { status });

/**
 * Achat simulé réutilisable (achat unitaire ou portefeuille du conseiller).
 * @returns la position créée, valorisée
 */
async function simulateBuy(org, userId, { isin, amountEur, quantity: qty }) {
  if (!/^[A-Z]{2}[A-Z0-9]{10}$/.test(isin || '')) throw httpError(400, 'ISIN invalide.');
  const stock = await equities.findStock(isin);
  if (!stock) throw httpError(404, 'Valeur introuvable.');
  if (!stock.priceEur) throw httpError(409, 'Cours indisponible pour cette valeur : réessayez plus tard.');

  let quantity = Number.parseInt(qty, 10);
  if (!quantity) {
    const amount = Number(amountEur);
    if (!Number.isFinite(amount) || amount <= 0) throw httpError(400, 'Indiquez un montant ou un nombre d’actions.');
    // Montant disponible pour les actions une fois les frais retirés
    quantity = Math.floor((amount - fees(amount)) / stock.priceEur);
  }
  if (!Number.isFinite(quantity) || quantity < 1) {
    throw httpError(400, `Montant insuffisant : une action ${stock.name} coûte ${stock.priceEur.toFixed(2)} € (hors frais).`);
  }

  const grossEur = round2(quantity * stock.priceEur);
  if (grossEur > MAX_ORDER_EUR) throw httpError(400, 'Montant trop élevé pour une simulation.');
  const feeEur = fees(grossEur);

  const position = await SimulatedPosition.create({
    organizationId: org._id,
    createdBy: userId,
    isin: stock.isin,
    symbol: stock.symbol,
    yahooSymbol: stock.yahooSymbol,
    name: stock.name,
    segment: stock.segment,
    market: stock.market,
    currency: stock.marketCapCurrency || stock.currency,
    quantity,
    buyPrice: stock.price,
    buyPriceEur: round2(stock.priceEur * 10000) / 10000,
    fees: feeEur,
    investedEur: round2(grossEur + feeEur),
  });
  return valuePosition(position.toObject(), stock);
}

// POST /api/investments/stocks — achat simulé { isin, amountEur } ou { isin, quantity }
const buy = async (req, res) => {
  const org = await getUserOrg(req.userId);
  if (!org) return res.status(404).json({ error: 'Organisation introuvable.' });
  try {
    const position = await simulateBuy(org, req.userId, req.body || {});
    res.status(201).json({ position });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

// POST /api/investments/stocks/:id/sell — vente simulée de toute la position
const sell = async (req, res) => {
  const org = await getUserOrg(req.userId);
  if (!org) return res.status(404).json({ error: 'Organisation introuvable.' });
  const pos = await SimulatedPosition.findOne({ _id: req.params.id, organizationId: org._id });
  if (!pos) return res.status(404).json({ error: 'Position introuvable.' });
  if (pos.status === 'sold') return res.status(409).json({ error: 'Position déjà vendue.' });

  const stock = await equities.findStock(pos.isin);
  if (!stock?.priceEur) return res.status(409).json({ error: 'Cours indisponible : vente impossible pour le moment.' });

  const grossEur = round2(pos.quantity * stock.priceEur);
  const proceedsEur = round2(grossEur - fees(grossEur));
  Object.assign(pos, {
    status: 'sold',
    soldAt: new Date(),
    sellPriceEur: round2(stock.priceEur * 10000) / 10000,
    proceedsEur,
    realizedPnlEur: round2(proceedsEur - pos.investedEur),
  });
  await pos.save();
  res.json({ position: valuePosition(pos.toObject(), stock) });
};

// DELETE /api/investments/stocks/:id — retire une position de la simulation
const remove = async (req, res) => {
  const org = await getUserOrg(req.userId);
  if (!org) return res.status(404).json({ error: 'Organisation introuvable.' });
  const result = await SimulatedPosition.deleteOne({ _id: req.params.id, organizationId: org._id });
  if (!result.deletedCount) return res.status(404).json({ error: 'Position introuvable.' });
  res.json({ ok: true });
};

module.exports = { getPortfolio, buy, sell, remove, simulateBuy, getUserOrg, FEE_RATE, FEE_MIN };
