/**
 * Conseiller Fluxora : collecte des données, univers de comparaison, Score Fluxora par valeur.
 *
 * Univers : les ~120 plus grosses capitalisations d'Euronext Paris + les 40 plus grosses d'Euronext Growth.
 * Il est recalculé chaque nuit (données mises en cache 24 h dans StockAnalysis) ; le score d'une valeur
 * hors univers est calculé à la demande et comparé à cet univers.
 *
 * ⚠️ Score quantitatif et pédagogique, pas un conseil en investissement personnalisé.
 */
const StockAnalysis = require('../../models/StockAnalysis');
const equities = require('../market/equitiesService');
const { yahoo } = require('../market/yahooClient');
const { VARIABLES, priceMetrics } = require('./variables');
const { buildDistributions, scoreValues } = require('./scoringService');
const { fetchNews } = require('./newsService');

const ANALYSIS_TTL = 24 * 3600 * 1000;
const MODULES = ['financialData', 'defaultKeyStatistics', 'summaryDetail', 'assetProfile', 'earningsTrend', 'majorHoldersBreakdown'];

const state = {
  building: false,
  progress: { done: 0, total: 0, startedAt: null, finishedAt: null },
  dist: null,
  distAt: 0,
  ranking: [], // [{ isin, yahooSymbol, name, segment, market, sector, score, verdict, confidence, families }]
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Exécute des tâches avec une concurrence limitée (respect des services externes)
async function pool(items, limit, fn) {
  let i = 0;
  const workers = Array.from({ length: limit }, async () => {
    while (i < items.length) { const item = items[i++]; await fn(item); }
  });
  await Promise.all(workers);
}

/** Données d'analyse d'une valeur (cache 24 h). `stock` vient d'equitiesService. */
async function analyze(stock, { force = false } = {}) {
  const cached = await StockAnalysis.findOne({ yahooSymbol: stock.yahooSymbol }).lean();
  if (!force && cached && Date.now() - new Date(cached.computedAt).getTime() < ANALYSIS_TTL) return cached;

  const [qs, ts, chart, news] = await Promise.all([
    yahoo.quoteSummary(stock.yahooSymbol, { modules: MODULES }, { validateResult: false }).catch(() => ({})),
    yahoo.fundamentalsTimeSeries(stock.yahooSymbol, { period1: new Date(Date.now() - 5 * 365 * 86400_000), type: 'annual', module: 'all' }, { validateResult: false }).catch(() => []),
    yahoo.chart(stock.yahooSymbol, { period1: new Date(Date.now() - 372 * 86400_000), interval: '1d' }, { validateResult: false }).catch(() => null),
    fetchNews(stock.name),
  ]);

  const closes = (chart?.quotes || []).map((q) => q.close).filter((v) => typeof v === 'number' && v > 0);
  const avgVolume = qs.summaryDetail?.averageVolume ?? qs.summaryDetail?.averageDailyVolume10Day;
  const px = {
    price: stock.price,
    marketCap: stock.marketCap ?? qs.summaryDetail?.marketCap,
    marketCapEur: stock.marketCapEur,
    avgTurnover: avgVolume && stock.priceEur ? avgVolume * stock.priceEur : null,
    ...priceMetrics(closes),
  };
  const ctx = { fd: qs.financialData, dks: qs.defaultKeyStatistics, sd: qs.summaryDetail, ap: qs.assetProfile,
    et: qs.earningsTrend, mh: qs.majorHoldersBreakdown, ts: Array.isArray(ts) ? ts : [], px, news };

  const values = {};
  for (const v of VARIABLES) {
    try { const x = v.compute(ctx); if (typeof x === 'number' && Number.isFinite(x)) values[v.key] = x; } catch { /* variable indisponible */ }
  }

  const doc = {
    yahooSymbol: stock.yahooSymbol, isin: stock.isin, name: stock.name, segment: stock.segment, market: stock.market,
    sector: qs.assetProfile?.sectorDisp || qs.assetProfile?.sector || null,
    industry: qs.assetProfile?.industryDisp || qs.assetProfile?.industry || null,
    currency: stock.currency,
    values, closes, closesStart: chart?.quotes?.[0]?.date || null,
    news: news.items, newsScore: news.count ? news.score : null,
    computedAt: new Date(),
  };
  return StockAnalysis.findOneAndUpdate({ yahooSymbol: stock.yahooSymbol }, doc, { upsert: true, new: true, setDefaultsOnInsert: true }).lean();
}

// Univers de comparaison : Paris top 120 + Growth top 40 (par capitalisation)
async function getUniverseStocks() {
  const [paris, growth] = await Promise.all([
    equities.listStocks({ segment: 'paris', top: 120, sort: 'marketCap', limit: 200 }),
    equities.listStocks({ segment: 'growth', sort: 'marketCap', limit: 40 }),
  ]);
  return [...paris.stocks, ...growth.stocks.filter((s) => s.marketCapEur)];
}

// Distributions de l'univers (depuis les analyses en base, cache 1 h)
async function getDistributions() {
  if (state.dist && Date.now() - state.distAt < 3600_000) return state.dist;
  const docs = await StockAnalysis.find({ computedAt: { $gte: new Date(Date.now() - 7 * 86400_000) } }, 'values sector').lean();
  state.dist = buildDistributions(docs);
  state.distAt = Date.now();
  state.universeSize = docs.length;
  return state.dist;
}

async function refreshRanking() {
  state.distAt = 0;
  const dist = await getDistributions();
  const docs = await StockAnalysis.find({ computedAt: { $gte: new Date(Date.now() - 7 * 86400_000) } }).lean();
  state.ranking = docs.map((d) => {
    const s = scoreValues(d.values, dist, { sector: d.sector });
    return { isin: d.isin, yahooSymbol: d.yahooSymbol, name: d.name, segment: d.segment, market: d.market, sector: d.sector,
      score: s.score, verdict: s.verdict, confidence: s.confidence, families: s.families.map((f) => ({ key: f.key, score: f.score })) };
  }).filter((r) => r.score != null).sort((a, b) => b.score - a.score);
  return state.ranking;
}

/** Calcule (ou rafraîchit) tout l'univers. Lancé chaque nuit et au démarrage si nécessaire. */
async function buildUniverse({ force = false } = {}) {
  if (state.building) return state.progress;
  state.building = true;
  try {
    const stocks = await getUniverseStocks();
    state.progress = { done: 0, total: stocks.length, startedAt: new Date(), finishedAt: null };
    await pool(stocks, 3, async (s) => {
      try { await analyze(s, { force }); } catch (e) { console.error('[Conseiller]', s.yahooSymbol, e.message); }
      state.progress.done++;
      await sleep(150);
    });
    await refreshRanking();
    state.progress.finishedAt = new Date();
    console.log(`[Conseiller] univers calculé : ${state.ranking.length} valeurs notées`);
  } finally {
    state.building = false;
  }
  return state.progress;
}

// Au démarrage : reprend le classement existant, ou lance le calcul si les données sont trop anciennes
async function init() {
  const fresh = await StockAnalysis.countDocuments({ computedAt: { $gte: new Date(Date.now() - ANALYSIS_TTL) } });
  await refreshRanking();
  if (fresh < 100) buildUniverse().catch((e) => console.error('[Conseiller] calcul :', e.message));
}

// Résumé rédigé par l'IA (facultatif, si ANTHROPIC_API_KEY est configurée), mis en cache 24 h
async function aiSummary(analysisDoc, detail) {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (analysisDoc.aiSummary && Date.now() - new Date(analysisDoc.aiSummaryAt).getTime() < ANALYSIS_TTL) return analysisDoc.aiSummary;
  try {
    const Anthropic = require('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const facts = [
      `Société : ${analysisDoc.name} (${analysisDoc.sector || 'secteur inconnu'})`,
      `Score Fluxora : ${detail.score} / 100 (${detail.verdict?.label})`,
      ...detail.families.map((f) => `${f.label} : ${f.score ?? 'n.d.'} / 100`),
      'Points forts : ' + detail.strengths.map((s) => s.text).join(' | '),
      'Points faibles : ' + detail.weaknesses.map((s) => s.text).join(' | '),
      'Titres de presse récents : ' + (analysisDoc.news || []).slice(0, 5).map((n) => n.title).join(' | '),
    ].join('\n');
    const res = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system: 'Tu es analyste financier. Rédige en français une synthèse neutre de 3 à 4 phrases, à partir des seuls faits fournis. '
        + 'N’invente aucun chiffre. Ne donne pas d’ordre d’achat ou de vente : explique ce que le score traduit (forces, faiblesses, points de vigilance).',
      messages: [{ role: 'user', content: facts }],
    });
    const text = res.content.find((b) => b.type === 'text')?.text?.trim() || null;
    if (text) await StockAnalysis.updateOne({ _id: analysisDoc._id }, { aiSummary: text, aiSummaryAt: new Date() });
    return text;
  } catch (e) {
    console.error('[Conseiller] synthèse IA :', e.message);
    return null;
  }
}

/** Score détaillé d'une valeur (clic sur une action). */
async function getStockScore(isin) {
  const stock = await equities.findStock(isin);
  if (!stock) return null;
  const analysis = await analyze(stock);
  const dist = await getDistributions();
  const detail = scoreValues(analysis.values, dist, { sector: analysis.sector });
  const rank = state.ranking.findIndex((r) => r.isin === isin);
  return {
    isin, name: stock.name, symbol: stock.symbol, segment: stock.segment, sector: analysis.sector, industry: analysis.industry,
    ...detail,
    rank: rank >= 0 ? rank + 1 : null,
    universeSize: state.ranking.length || state.universeSize || 0,
    universeBuilding: state.building ? state.progress : null,
    news: (analysis.news || []).map((n) => ({ ...n, tone: n.sentiment > 0 ? 'positive' : n.sentiment < 0 ? 'negative' : 'neutral' })),
    newsScore: analysis.newsScore,
    aiSummary: await aiSummary(analysis, detail),
    computedAt: analysis.computedAt,
  };
}

const getRanking = () => state.ranking;
const getStatus = () => ({ building: state.building, progress: state.progress, ranked: state.ranking.length });
const getScoreMap = () => new Map(state.ranking.map((r) => [r.isin, r.score]));

module.exports = { analyze, buildUniverse, refreshRanking, init, getStockScore, getRanking, getStatus, getScoreMap, getDistributions };
