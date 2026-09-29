/**
 * Portefeuille optimisé à partir du Score Fluxora.
 *
 * 1. Sélection : meilleures valeurs notées (score ≥ minimum, confiance ≥ 50 %), avec un plafond par secteur.
 * 2. Pondération : maximise  score moyen pondéré − λ × variance du portefeuille
 *    (covariances calculées sur 1 an de rendements quotidiens, avec réduction vers la diagonale),
 *    sous contraintes : poids entre 2 % et le maximum par ligne, plafond par secteur, somme = 100 %.
 * 3. Rétrospective 1 an face au CAC 40 (indicatif : biais de sélection, les performances passées
 *    ne préjugent pas des performances futures).
 */
const StockAnalysis = require('../../models/StockAnalysis');
const { yahoo } = require('../market/yahooClient');
const { getRanking } = require('./advisorService');

const r2 = (n) => Math.round(n * 100) / 100;
const r4 = (n) => Math.round(n * 10000) / 10000;

// Projection sur { lo ≤ w_i ≤ hi, Σ w = 1 } (recherche du décalage par dichotomie)
function projectCappedSimplex(v, lo, hi) {
  let a = Math.min(...v) - hi; let b = Math.max(...v) - lo;
  for (let it = 0; it < 60; it++) {
    const tau = (a + b) / 2;
    const s = v.reduce((sum, x) => sum + Math.min(hi, Math.max(lo, x - tau)), 0);
    if (s > 1) a = tau; else b = tau;
  }
  const tau = (a + b) / 2;
  return v.map((x) => Math.min(hi, Math.max(lo, x - tau)));
}

// Plafond par secteur : réduit les secteurs trop lourds et redistribue l'excédent aux autres
function applySectorCap(w, sectors, cap) {
  const out = [...w];
  for (let it = 0; it < 20; it++) {
    const bySector = {};
    out.forEach((x, i) => { bySector[sectors[i]] = (bySector[sectors[i]] || 0) + x; });
    const over = Object.entries(bySector).filter(([, t]) => t > cap + 1e-6);
    if (!over.length) break;
    let excess = 0;
    for (const [sec, total] of over) {
      const f = cap / total;
      out.forEach((x, i) => { if (sectors[i] === sec) { excess += x * (1 - f); out[i] = x * f; } });
    }
    const receivers = out.map((x, i) => (bySector[sectors[i]] < cap ? i : -1)).filter((i) => i >= 0);
    const base = receivers.reduce((s, i) => s + out[i], 0) || 1;
    receivers.forEach((i) => { out[i] += excess * (out[i] / base); });
  }
  return out;
}

// Rendements quotidiens alignés sur la fin (même longueur pour toutes les valeurs)
function alignedReturns(closesList) {
  const n = Math.min(...closesList.map((c) => c.length));
  return closesList.map((c) => {
    const s = c.slice(-n);
    return s.slice(1).map((v, i) => Math.log(v / s[i]));
  });
}

function covariance(returns, shrink = 0.3) {
  const k = returns.length; const T = returns[0].length;
  const means = returns.map((r) => r.reduce((s, x) => s + x, 0) / T);
  const cov = Array.from({ length: k }, () => new Array(k).fill(0));
  for (let i = 0; i < k; i++) for (let j = i; j < k; j++) {
    let s = 0;
    for (let t = 0; t < T; t++) s += (returns[i][t] - means[i]) * (returns[j][t] - means[j]);
    const c = (s / (T - 1)) * 252; // annualisée
    cov[i][j] = cov[j][i] = i === j ? c : c * (1 - shrink);
  }
  return cov;
}

const portfolioVariance = (w, cov) => w.reduce((s, wi, i) => s + wi * cov[i].reduce((t, c, j) => t + c * w[j], 0), 0);

/**
 * @param {{ size?: number, maxWeight?: number, maxSector?: number, minScore?: number, riskAversion?: number }} opts
 */
async function optimize({ size = 15, maxWeight = 0.10, maxSector = 0.25, minScore = 55, riskAversion = 3 } = {}) {
  size = Math.min(Math.max(Number(size) || 15, 8), 25);
  maxWeight = Math.max(maxWeight, 1 / size + 0.01); // doit permettre d'atteindre 100 %
  const ranking = getRanking();
  if (ranking.length < 20) return { ready: false, message: 'Le classement est en cours de calcul (quelques minutes après le démarrage du serveur).' };

  // 1. Sélection avec plafond par secteur (en nombre de lignes)
  const maxPerSector = Math.max(2, Math.floor(maxSector * size));
  const candidates = ranking.filter((r) => r.score >= minScore && r.confidence >= 50);
  const docs = new Map((await StockAnalysis.find({ isin: { $in: candidates.map((c) => c.isin) } }, 'isin closes sector name').lean()).map((d) => [d.isin, d]));
  const picked = []; const perSector = {};
  for (const c of candidates) {
    const d = docs.get(c.isin);
    if (!d || (d.closes || []).length < 150) continue;
    const sec = c.sector || 'Autre';
    if ((perSector[sec] || 0) >= maxPerSector) continue;
    perSector[sec] = (perSector[sec] || 0) + 1;
    picked.push({ ...c, sector: sec, closes: d.closes });
    if (picked.length >= size) break;
  }
  if (picked.length < 8) return { ready: false, message: `Seulement ${picked.length} valeurs atteignent le score minimum de ${minScore} % : abaissez le seuil.` };

  // 2. Pondération : gradient projeté sur  f(w) = w·s − λ w'Σw
  const returns = alignedReturns(picked.map((p) => p.closes));
  const cov = covariance(returns);
  const s = picked.map((p) => (p.score - 50) / 50); // attractivité normalisée
  const sectors = picked.map((p) => p.sector);
  const lo = 0.02;
  let w = projectCappedSimplex(picked.map(() => 1 / picked.length), lo, maxWeight);
  for (let it = 0; it < 400; it++) {
    const grad = w.map((_, i) => s[i] - 2 * riskAversion * cov[i].reduce((t, c, j) => t + c * w[j], 0));
    w = projectCappedSimplex(w.map((x, i) => x + 0.02 * grad[i]), lo, maxWeight);
    w = applySectorCap(w, sectors, maxSector);
    w = projectCappedSimplex(w, lo, maxWeight);
  }
  const total = w.reduce((a, b) => a + b, 0);
  w = w.map((x) => x / total);

  const vol = Math.sqrt(portfolioVariance(w, cov));
  const avgVol = Math.sqrt(picked.reduce((sum, _, i) => sum + w[i] * cov[i][i], 0));
  const holdings = picked.map((p, i) => ({
    isin: p.isin, yahooSymbol: p.yahooSymbol, name: p.name, segment: p.segment, market: p.market, sector: p.sector,
    score: p.score, verdict: p.verdict, weight: r4(w[i]), volatility: r4(Math.sqrt(cov[i][i])),
  })).sort((a, b) => b.weight - a.weight);
  const sectorsBreakdown = Object.entries(holdings.reduce((acc, h) => ({ ...acc, [h.sector]: (acc[h.sector] || 0) + h.weight }), {}))
    .map(([sector, weight]) => ({ sector, weight: r4(weight) })).sort((a, b) => b.weight - a.weight);

  // 3. Rétrospective 1 an (poids fixes) face au CAC 40
  const n = Math.min(...picked.map((p) => p.closes.length));
  const series = Array.from({ length: n }, (_, t) => r2(100 * picked.reduce((sum, p, i) => sum + w[i] * (p.closes[p.closes.length - n + t] / p.closes[p.closes.length - n]), 0)));
  let benchmark = [];
  try {
    const cac = await yahoo.chart('^FCHI', { period1: new Date(Date.now() - 372 * 86400_000), interval: '1d' }, { validateResult: false });
    const c = (cac?.quotes || []).map((q) => q.close).filter((v) => v > 0).slice(-n);
    benchmark = c.map((v) => r2((100 * v) / c[0]));
  } catch { /* indice indisponible */ }
  const perf = (arr) => (arr.length ? r4(arr[arr.length - 1] / 100 - 1) : null);
  const drawdown = (arr) => { let peak = -Infinity; let m = 0; for (const v of arr) { peak = Math.max(peak, v); m = Math.min(m, v / peak - 1); } return r4(m); };

  return {
    ready: true,
    params: { size, maxWeight: r4(maxWeight), maxSector, minScore, riskAversion },
    holdings,
    sectors: sectorsBreakdown,
    metrics: {
      averageScore: r2(holdings.reduce((sum, h) => sum + h.score * h.weight, 0)),
      expectedVolatility: r4(vol),
      diversificationGain: r4(1 - vol / avgVol), // réduction de risque due à la diversification
      lines: holdings.length,
    },
    backtest: {
      portfolio: series,
      benchmark,
      benchmarkLabel: 'CAC 40',
      portfolioReturn: perf(series),
      benchmarkReturn: perf(benchmark),
      portfolioMaxDrawdown: drawdown(series),
      benchmarkMaxDrawdown: benchmark.length ? drawdown(benchmark) : null,
      days: n,
    },
    disclaimer: 'Rétrospective indicative : les valeurs sont choisies avec les données d’aujourd’hui (biais de sélection). '
      + 'Les performances passées ne préjugent pas des performances futures. Ceci n’est pas un conseil en investissement.',
  };
}

module.exports = { optimize, projectCappedSimplex, applySectorCap };
