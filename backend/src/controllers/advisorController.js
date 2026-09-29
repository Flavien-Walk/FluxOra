/**
 * Conseiller Fluxora (Score Fluxora sur 50 variables, portefeuille optimisé).
 * Outil quantitatif et pédagogique : pas un conseil en investissement personnalisé.
 */
const advisor = require('../services/advisor/advisorService');
const { optimize } = require('../services/advisor/portfolioService');
const { FAMILIES, VARIABLES } = require('../services/advisor/variables');
const { simulateBuy, getUserOrg } = require('./stockSimulationController');

const DISCLAIMER = 'Score quantitatif et pédagogique calculé automatiquement à partir de données publiques (Yahoo Finance, presse). '
  + 'Ce n’est pas un conseil en investissement : investir en actions comporte un risque de perte en capital.';

// GET /api/investments/advisor/score/:isin — note et explications d'une valeur
const getScore = async (req, res) => {
  if (!/^[A-Z]{2}[A-Z0-9]{10}$/.test(req.params.isin)) return res.status(400).json({ error: 'ISIN invalide.' });
  try {
    const score = await advisor.getStockScore(req.params.isin);
    if (!score) return res.status(404).json({ error: 'Valeur introuvable.' });
    res.json({ ...score, disclaimer: DISCLAIMER });
  } catch (err) {
    console.error('[Conseiller]', err.message);
    res.status(503).json({ error: 'Analyse momentanément indisponible. Réessayez dans un instant.' });
  }
};

// GET /api/investments/advisor/ranking — classement de l'univers
const getRanking = async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  res.json({ ranking: advisor.getRanking().slice(0, limit), status: advisor.getStatus(), disclaimer: DISCLAIMER });
};

// GET /api/investments/advisor/methodology — les 50 variables et leurs poids
const getMethodology = (req, res) => {
  res.json({
    families: Object.entries(FAMILIES).map(([key, f]) => ({
      key, label: f.label, weight: f.weight,
      variables: VARIABLES.filter((v) => v.family === key).map((v) => ({ key: v.key, label: v.label, better: v.dir === 1 ? 'plus élevé' : 'plus bas', notForFinancials: !!v.notForFinancials })),
    })),
    disclaimer: DISCLAIMER,
  });
};

// GET /api/investments/advisor/portfolio?size=&minScore=&maxWeight=&maxSector=
const getPortfolio = async (req, res) => {
  const { size, minScore, maxWeight, maxSector } = req.query;
  const result = await optimize({
    size: Number(size) || 15,
    minScore: Number(minScore) || 55,
    maxWeight: Number(maxWeight) || 0.10,
    maxSector: Number(maxSector) || 0.25,
  });
  res.json({ ...result, status: advisor.getStatus(), disclaimer: DISCLAIMER });
};

// POST /api/investments/advisor/portfolio/invest { amountEur, size, minScore } — achat simulé de tout le portefeuille
const investPortfolio = async (req, res) => {
  const org = await getUserOrg(req.userId);
  if (!org) return res.status(404).json({ error: 'Organisation introuvable.' });
  const amountEur = Number(req.body?.amountEur);
  if (!Number.isFinite(amountEur) || amountEur < 1000) return res.status(400).json({ error: 'Montant minimum : 1 000 €.' });
  const pf = await optimize({ size: Number(req.body?.size) || 15, minScore: Number(req.body?.minScore) || 55 });
  if (!pf.ready) return res.status(409).json({ error: pf.message });

  const bought = []; const skipped = [];
  for (const h of pf.holdings) {
    try {
      const position = await simulateBuy(org, req.userId, { isin: h.isin, amountEur: amountEur * h.weight });
      bought.push({ name: h.name, quantity: position.quantity, investedEur: position.investedEur });
    } catch (err) {
      skipped.push({ name: h.name, reason: err.message });
    }
  }
  res.status(201).json({ bought, skipped, investedEur: Math.round(bought.reduce((s, b) => s + b.investedEur, 0) * 100) / 100 });
};

// POST /api/investments/advisor/refresh — recalcul de l'univers (admin)
const refresh = async (req, res) => {
  advisor.buildUniverse({ force: true }).catch((e) => console.error('[Conseiller]', e.message));
  res.status(202).json({ status: advisor.getStatus() });
};

module.exports = { getScore, getRanking, getMethodology, getPortfolio, investPortfolio, refresh };
