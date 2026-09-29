/**
 * Simulation d'investissement en actions (Euronext Paris / Growth).
 * Aucun ordre n'est transmis à un courtier et aucune écriture comptable n'est créée :
 * les positions servent uniquement à simuler un portefeuille au cours différé de 15 minutes.
 */
const Organization = require('../models/Organization');
const SimulatedPosition = require('../models/SimulatedPosition');
const equities = require('../services/market/equitiesService');
const wallet = require('../services/virtualWalletService');

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

/**
 * Portefeuille virtuel valorisé : positions, espèces, performance et historique.
 * @param {{ record?: boolean }} opts record : enregistre la valorisation du jour
 */
async function computePortfolio(orgId, { record = true } = {}) {
  const w = await wallet.getWallet(orgId);
  const positions = await SimulatedPosition.find({ organizationId: orgId }).sort({ boughtAt: -1 }).lean();

  const lives = new Map();
  await Promise.all([...new Set(positions.filter((p) => p.status === 'open').map((p) => p.isin))].map(async (isin) => {
    try { lives.set(isin, await equities.findStock(isin)); } catch { /* cours indisponible */ }
  }));

  const valued = positions.map((p) => valuePosition(p, lives.get(p.isin)));
  const open = valued.filter((p) => p.status === 'open');
  const investedEur = round2(open.reduce((s, p) => s + p.investedEur, 0));
  const valueEur = round2(open.reduce((s, p) => s + (p.valueEur ?? p.investedEur), 0));
  const realizedPnlEur = round2(valued.filter((p) => p.status === 'sold').reduce((s, p) => s + (p.realizedPnlEur || 0), 0));
  const totalValueEur = round2(w.cash + valueEur);

  // Répartition : une ligne par valeur, plus les espèces, en % de la valeur totale
  const byIsin = new Map();
  for (const p of open) {
    const e = byIsin.get(p.isin) || { name: p.name, isin: p.isin, valueEur: 0 };
    e.valueEur += p.valueEur ?? p.investedEur;
    byIsin.set(p.isin, e);
  }
  const allocation = [...byIsin.values()]
    .concat(w.cash > 0 ? [{ name: 'Espèces', isin: null, valueEur: w.cash }] : [])
    .map((x) => ({ ...x, valueEur: round2(x.valueEur), weight: totalValueEur ? round2((x.valueEur / totalValueEur) * 100) : 0 }))
    .sort((x, y) => y.valueEur - x.valueEur);

  if (record) await wallet.snapshot(w, { valueEur: totalValueEur }).catch((e) => console.error('[Portefeuille] historique :', e.message));
  const history = record ? (await wallet.getWallet(orgId)).snapshots : w.snapshots;

  return {
    positions: valued,
    totals: {
      investedEur,
      valueEur,
      unrealizedPnlEur: round2(valueEur - investedEur),
      unrealizedPnlPercent: investedEur ? round2(((valueEur - investedEur) / investedEur) * 100) : 0,
      realizedPnlEur,
    },
    wallet: {
      initialCapital: w.initialCapital,
      cashEur: round2(w.cash),
      totalValueEur,
      performanceEur: round2(totalValueEur - w.initialCapital),
      performancePercent: w.initialCapital ? round2(((totalValueEur - w.initialCapital) / w.initialCapital) * 100) : 0,
      startedAt: w.startedAt,
      history,
      allocation,
    },
    fees: { rate: FEE_RATE, min: FEE_MIN },
  };
}

// GET /api/investments/stocks — portefeuille virtuel valorisé et journal des opérations
const getPortfolio = async (req, res) => {
  const org = await getUserOrg(req.userId);
  if (!org) return res.status(404).json({ error: 'Organisation introuvable.' });
  const portfolio = await computePortfolio(org._id);
  res.json({ ...portfolio, transactions: await wallet.listTransactions(org._id) });
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
  const totalEur = round2(grossEur + feeEur);

  // Débit des espèces du portefeuille virtuel (refusé si le solde est insuffisant)
  await wallet.debit(org._id, totalEur, {
    createdBy: userId, type: 'buy', isin: stock.isin, name: stock.name, quantity,
    priceEur: round2(stock.priceEur * 10000) / 10000, feesEur: feeEur,
  });

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
    investedEur: totalEur,
  }).catch(async (err) => {
    await wallet.credit(org._id, totalEur); // annulation du débit
    throw err;
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

// POST /api/investments/stocks/:id/sell — vente simulée { quantity? } (toute la position par défaut)
const sell = async (req, res) => {
  const org = await getUserOrg(req.userId);
  if (!org) return res.status(404).json({ error: 'Organisation introuvable.' });
  const pos = await SimulatedPosition.findOne({ _id: req.params.id, organizationId: org._id });
  if (!pos) return res.status(404).json({ error: 'Position introuvable.' });
  if (pos.status === 'sold') return res.status(409).json({ error: 'Position déjà vendue.' });

  const quantity = req.body?.quantity == null ? pos.quantity : Number(req.body.quantity);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > pos.quantity) {
    return res.status(400).json({ error: `Quantité à vendre entre 1 et ${pos.quantity}.` });
  }

  const stock = await equities.findStock(pos.isin);
  if (!stock?.priceEur) return res.status(409).json({ error: 'Cours indisponible : vente impossible pour le moment.' });

  const sellPriceEur = round2(stock.priceEur * 10000) / 10000;
  const grossEur = round2(quantity * stock.priceEur);
  const feeEur = fees(grossEur);
  const proceedsEur = round2(grossEur - feeEur);
  // Prix de revient de la part vendue (frais d'achat inclus, au prorata)
  const costEur = round2((pos.investedEur * quantity) / pos.quantity);
  const sold = { status: 'sold', soldAt: new Date(), sellPriceEur, proceedsEur, realizedPnlEur: round2(proceedsEur - costEur) };

  let soldPos;
  if (quantity === pos.quantity) {
    Object.assign(pos, sold);
    soldPos = await pos.save();
  } else {
    // Vente partielle : la part vendue devient une ligne « vendue », le reste reste ouvert
    const { _id, createdAt, updatedAt, ...base } = pos.toObject();
    const soldFees = round2((pos.fees * quantity) / pos.quantity);
    soldPos = await SimulatedPosition.create({ ...base, ...sold, quantity, investedEur: costEur, fees: soldFees });
    pos.quantity -= quantity;
    pos.investedEur = round2(pos.investedEur - costEur);
    pos.fees = round2(pos.fees - soldFees);
    await pos.save();
  }

  await wallet.credit(org._id, proceedsEur, {
    createdBy: req.userId, type: 'sell', isin: pos.isin, name: pos.name, quantity,
    priceEur: sellPriceEur, feesEur: feeEur, pnlEur: sold.realizedPnlEur,
  });
  res.json({ position: valuePosition(soldPos.toObject(), stock) });
};

// DELETE /api/investments/stocks/:id — retire une vente passée de l'historique
const remove = async (req, res) => {
  const org = await getUserOrg(req.userId);
  if (!org) return res.status(404).json({ error: 'Organisation introuvable.' });
  const pos = await SimulatedPosition.findOne({ _id: req.params.id, organizationId: org._id }, 'status').lean();
  if (!pos) return res.status(404).json({ error: 'Position introuvable.' });
  if (pos.status === 'open') return res.status(409).json({ error: 'Vendez la position avant de la retirer de l’historique.' });
  await SimulatedPosition.deleteOne({ _id: pos._id });
  res.json({ ok: true });
};

// POST /api/investments/stocks/wallet/deposit — apport de capital fictif { amountEur }
const deposit = async (req, res) => {
  const org = await getUserOrg(req.userId);
  if (!org) return res.status(404).json({ error: 'Organisation introuvable.' });
  try {
    res.json({ cashEur: await wallet.deposit(org._id, req.userId, req.body?.amountEur) });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

// POST /api/investments/stocks/wallet/reset — nouveau départ { capital }
const resetWallet = async (req, res) => {
  const org = await getUserOrg(req.userId);
  if (!org) return res.status(404).json({ error: 'Organisation introuvable.' });
  try {
    await wallet.reset(org._id, req.userId, req.body?.capital ?? wallet.DEFAULT_CAPITAL);
    res.json({ ok: true });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

module.exports = { getPortfolio, computePortfolio, buy, sell, remove, deposit, resetWallet, simulateBuy, getUserOrg, FEE_RATE, FEE_MIN };
