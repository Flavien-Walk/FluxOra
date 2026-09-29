/**
 * Les 50 variables du Score Fluxora (horizon long terme), réparties en 7 familles pondérées.
 *
 * Chaque variable :
 *  - key / label / family
 *  - dir : +1 si « plus haut = mieux », -1 si « plus bas = mieux »
 *  - fmt : 'pct' (0.123 → 12,3 %), 'x' (multiple), 'num', 'eur', 'days'
 *  - compute(ctx) → valeur brute (null si indisponible ou non pertinente)
 *
 * ctx = { fd, dks, sd, ap, et, mh, ts, px, news } (données Yahoo, historiques, cours, presse)
 */

const FAMILIES = {
  quality:   { label: 'Qualité et rentabilité', weight: 0.25 },
  growth:    { label: 'Croissance',             weight: 0.20 },
  valuation: { label: 'Valorisation',           weight: 0.20 },
  solidity:  { label: 'Solidité financière',    weight: 0.15 },
  risk:      { label: 'Risque',                 weight: 0.10 },
  trend:     { label: 'Tendance long terme',    weight: 0.05 },
  sentiment: { label: 'Sentiment',              weight: 0.05 },
};

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const pos = (v) => (num(v) != null && v > 0 ? v : null);           // ratio valable seulement s'il est positif
const div = (a, b) => (num(a) != null && num(b) ? a / b : null);
const cagr = (first, last, years) => (num(first) > 0 && num(last) > 0 && years > 0 ? (last / first) ** (1 / years) - 1 : null);

// Séries annuelles (fundamentalsTimeSeries) : première et dernière valeur disponibles
function series(ts, field) {
  const rows = (ts || []).filter((r) => num(r[field]) != null).sort((a, b) => new Date(a.date) - new Date(b.date));
  return rows.map((r) => ({ year: new Date(r.date).getFullYear(), v: r[field] }));
}
function seriesCagr(ts, field) {
  const s = series(ts, field);
  if (s.length < 2) return null;
  return cagr(s[0].v, s[s.length - 1].v, s[s.length - 1].year - s[0].year);
}
const latest = (ts, field) => { const s = series(ts, field); return s.length ? s[s.length - 1].v : null; };

const VARIABLES = [
  // ── Qualité et rentabilité (10) ─────────────────────────────────────────
  { key: 'grossMargin', notForFinancials: true, family: 'quality', label: 'Marge brute', dir: 1, fmt: 'pct', compute: (c) => num(c.fd?.grossMargins) || null },
  { key: 'operatingMargin', family: 'quality', label: 'Marge opérationnelle', dir: 1, fmt: 'pct', compute: (c) => num(c.fd?.operatingMargins) },
  { key: 'netMargin', family: 'quality', label: 'Marge nette', dir: 1, fmt: 'pct', compute: (c) => num(c.fd?.profitMargins) },
  { key: 'ebitdaMargin', notForFinancials: true, family: 'quality', label: 'Marge d’EBITDA', dir: 1, fmt: 'pct', compute: (c) => num(c.fd?.ebitdaMargins) || null },
  { key: 'roe', family: 'quality', label: 'Rentabilité des capitaux propres (ROE)', dir: 1, fmt: 'pct', compute: (c) => num(c.fd?.returnOnEquity) },
  { key: 'roa', notForFinancials: true, family: 'quality', label: 'Rentabilité des actifs (ROA)', dir: 1, fmt: 'pct', compute: (c) => num(c.fd?.returnOnAssets) },
  { key: 'fcfMargin', notForFinancials: true, family: 'quality', label: 'Marge de free cash-flow', dir: 1, fmt: 'pct', compute: (c) => div(c.fd?.freeCashflow, c.fd?.totalRevenue) },
  { key: 'earningsQuality', notForFinancials: true, family: 'quality', label: 'Qualité des bénéfices (cash ÷ résultat)', dir: 1, fmt: 'x',
    compute: (c) => { const ni = latest(c.ts, 'netIncome'); const r = ni > 0 ? div(latest(c.ts, 'operatingCashFlow'), ni) : null; return r != null ? Math.min(r, 3) : null; } },
  { key: 'marginStability', family: 'quality', label: 'Instabilité de la marge opérationnelle (3 ans)', dir: -1, fmt: 'pct',
    compute: (c) => {
      const rev = series(c.ts, 'totalRevenue'); const op = series(c.ts, 'operatingIncome');
      const m = rev.map((r) => { const o = op.find((x) => x.year === r.year); return o && r.v ? o.v / r.v : null; }).filter((v) => v != null);
      if (m.length < 3) return null;
      const mean = m.reduce((s, v) => s + v, 0) / m.length;
      return Math.sqrt(m.reduce((s, v) => s + (v - mean) ** 2, 0) / m.length);
    } },
  { key: 'payoutSustainability', family: 'quality', label: 'Soutenabilité du dividende (distribution proche de 40 %)', dir: -1, fmt: 'pct',
    compute: (c) => { const p = num(c.sd?.payoutRatio); return p == null || p === 0 ? null : Math.abs(p - 0.4); } },

  // ── Croissance (8) ──────────────────────────────────────────────────────
  { key: 'revenueGrowth', family: 'growth', label: 'Croissance du chiffre d’affaires (1 an)', dir: 1, fmt: 'pct', compute: (c) => num(c.fd?.revenueGrowth) },
  { key: 'revenueCagr', family: 'growth', label: 'Croissance annuelle du CA (3 ans)', dir: 1, fmt: 'pct', compute: (c) => seriesCagr(c.ts, 'totalRevenue') },
  { key: 'earningsGrowth', family: 'growth', label: 'Croissance des bénéfices (1 an)', dir: 1, fmt: 'pct', compute: (c) => num(c.fd?.earningsGrowth) },
  { key: 'netIncomeCagr', family: 'growth', label: 'Croissance annuelle du résultat net (3 ans)', dir: 1, fmt: 'pct', compute: (c) => seriesCagr(c.ts, 'netIncome') },
  { key: 'forwardEpsGrowth', family: 'growth', label: 'Progression du BPA attendue (prévisionnel ÷ actuel)', dir: 1, fmt: 'pct',
    compute: (c) => { const t = pos(c.dks?.trailingEps); const f = num(c.dks?.forwardEps); return t && f != null ? f / t - 1 : null; } },
  { key: 'analystGrowth', family: 'growth', label: 'Croissance des bénéfices prévue par les analystes', dir: 1, fmt: 'pct',
    compute: (c) => num((c.et?.trend || []).find((t) => t.period === '+1y')?.growth) },
  { key: 'fcfCagr', notForFinancials: true, family: 'growth', label: 'Croissance annuelle du free cash-flow (3 ans)', dir: 1, fmt: 'pct', compute: (c) => seriesCagr(c.ts, 'freeCashFlow') },
  { key: 'equityCagr', family: 'growth', label: 'Croissance annuelle des capitaux propres (3 ans)', dir: 1, fmt: 'pct', compute: (c) => seriesCagr(c.ts, 'stockholdersEquity') },

  // ── Valorisation (10) ───────────────────────────────────────────────────
  { key: 'pe', family: 'valuation', label: 'PER (cours ÷ bénéfice)', dir: -1, fmt: 'x', compute: (c) => pos(c.sd?.trailingPE) },
  { key: 'forwardPe', family: 'valuation', label: 'PER prévisionnel', dir: -1, fmt: 'x', compute: (c) => pos(c.sd?.forwardPE ?? c.dks?.forwardPE) },
  { key: 'peg', family: 'valuation', label: 'PEG (PER ÷ croissance)', dir: -1, fmt: 'x', compute: (c) => pos(c.dks?.pegRatio) },
  { key: 'priceToBook', family: 'valuation', label: 'Cours ÷ valeur comptable', dir: -1, fmt: 'x', compute: (c) => pos(c.dks?.priceToBook) },
  { key: 'priceToSales', notForFinancials: true, family: 'valuation', label: 'Capitalisation ÷ chiffre d’affaires', dir: -1, fmt: 'x', compute: (c) => pos(c.sd?.priceToSalesTrailing12Months) },
  { key: 'evToEbitda', notForFinancials: true, family: 'valuation', label: 'Valeur d’entreprise ÷ EBITDA', dir: -1, fmt: 'x', compute: (c) => pos(c.dks?.enterpriseToEbitda) },
  { key: 'evToRevenue', notForFinancials: true, family: 'valuation', label: 'Valeur d’entreprise ÷ CA', dir: -1, fmt: 'x', compute: (c) => pos(c.dks?.enterpriseToRevenue) },
  { key: 'fcfYield', notForFinancials: true, family: 'valuation', label: 'Rendement du free cash-flow', dir: 1, fmt: 'pct', compute: (c) => div(c.fd?.freeCashflow, c.px?.marketCap) },
  { key: 'dividendYield', family: 'valuation', label: 'Rendement du dividende', dir: 1, fmt: 'pct', compute: (c) => num(c.sd?.dividendYield) ?? 0 },
  { key: 'targetUpside', family: 'valuation', label: 'Potentiel vers l’objectif moyen des analystes', dir: 1, fmt: 'pct',
    compute: (c) => { const t = pos(c.fd?.targetMeanPrice); const p = pos(c.fd?.currentPrice ?? c.px?.price); return t && p && (c.fd?.numberOfAnalystOpinions || 0) >= 2 ? t / p - 1 : null; } },

  // ── Solidité financière (7) ─────────────────────────────────────────────
  { key: 'debtToEquity', notForFinancials: true, family: 'solidity', label: 'Dette ÷ capitaux propres', dir: -1, fmt: 'pct', compute: (c) => { const v = num(c.fd?.debtToEquity); return v != null ? v / 100 : null; } },
  { key: 'netDebtToEbitda', notForFinancials: true, family: 'solidity', label: 'Dette nette ÷ EBITDA', dir: -1, fmt: 'x',
    compute: (c) => { const e = pos(c.fd?.ebitda); return e && num(c.fd?.totalDebt) != null ? ((c.fd.totalDebt - (c.fd.totalCash || 0)) / e) : null; } },
  { key: 'interestCoverage', notForFinancials: true, family: 'solidity', label: 'Couverture des intérêts (EBIT ÷ intérêts)', dir: 1, fmt: 'x',
    compute: (c) => { const i = pos(latest(c.ts, 'interestExpense')); const r = i ? div(latest(c.ts, 'EBIT'), i) : null; return r != null ? Math.min(r, 100) : null; } },
  { key: 'currentRatio', notForFinancials: true, family: 'solidity', label: 'Liquidité générale', dir: 1, fmt: 'x', compute: (c) => { const v = pos(c.fd?.currentRatio); return v != null ? Math.min(v, 4) : null; } },
  { key: 'quickRatio', notForFinancials: true, family: 'solidity', label: 'Liquidité immédiate', dir: 1, fmt: 'x', compute: (c) => { const v = pos(c.fd?.quickRatio); return v != null ? Math.min(v, 4) : null; } },
  { key: 'cashToDebt', notForFinancials: true, family: 'solidity', label: 'Trésorerie ÷ dette', dir: 1, fmt: 'x', compute: (c) => { const r = div(c.fd?.totalCash, pos(c.fd?.totalDebt)); return r != null ? Math.min(r, 5) : null; } },
  { key: 'cashToMarketCap', notForFinancials: true, family: 'solidity', label: 'Trésorerie ÷ capitalisation', dir: 1, fmt: 'pct', compute: (c) => div(c.fd?.totalCash, c.px?.marketCap) },

  // ── Risque (6) ──────────────────────────────────────────────────────────
  { key: 'volatility', family: 'risk', label: 'Volatilité annuelle', dir: -1, fmt: 'pct', compute: (c) => c.px?.volatility ?? null },
  { key: 'downsideVolatility', family: 'risk', label: 'Volatilité à la baisse', dir: -1, fmt: 'pct', compute: (c) => c.px?.downsideVolatility ?? null },
  { key: 'maxDrawdown', family: 'risk', label: 'Perte maximale sur 1 an', dir: 1, fmt: 'pct', compute: (c) => c.px?.maxDrawdown ?? null },
  { key: 'beta', family: 'risk', label: 'Bêta (sensibilité au marché)', dir: -1, fmt: 'num', compute: (c) => num(c.dks?.beta ?? c.sd?.beta) },
  { key: 'liquidity', family: 'risk', label: 'Liquidité du titre (montant échangé par jour)', dir: 1, fmt: 'eur', compute: (c) => c.px?.avgTurnover ?? null },
  { key: 'size', family: 'risk', label: 'Taille (capitalisation)', dir: 1, fmt: 'eur', compute: (c) => pos(c.px?.marketCapEur) },

  // ── Tendance long terme (5) ─────────────────────────────────────────────
  { key: 'momentum12', family: 'trend', label: 'Performance 12 mois (hors dernier mois)', dir: 1, fmt: 'pct', compute: (c) => c.px?.momentum12_1 ?? null },
  { key: 'momentum6', family: 'trend', label: 'Performance 6 mois', dir: 1, fmt: 'pct', compute: (c) => c.px?.momentum6 ?? null },
  { key: 'priceVsMa200', family: 'trend', label: 'Cours ÷ moyenne 200 jours', dir: 1, fmt: 'pct', compute: (c) => c.px?.priceVsMa200 ?? null },
  { key: 'ma50VsMa200', family: 'trend', label: 'Moyenne 50 jours ÷ moyenne 200 jours', dir: 1, fmt: 'pct', compute: (c) => c.px?.ma50VsMa200 ?? null },
  { key: 'fromHigh', family: 'trend', label: 'Écart au plus haut sur 52 semaines', dir: 1, fmt: 'pct', compute: (c) => c.px?.fromHigh ?? null },

  // ── Sentiment (4) ───────────────────────────────────────────────────────
  { key: 'analystRating', family: 'sentiment', label: 'Consensus des analystes (1 = achat fort, 5 = vente)', dir: -1, fmt: 'num',
    compute: (c) => ((c.fd?.numberOfAnalystOpinions || 0) >= 2 ? num(c.fd?.recommendationMean) : null) },
  { key: 'analystCount', family: 'sentiment', label: 'Nombre d’analystes qui suivent la valeur', dir: 1, fmt: 'num', compute: (c) => num(c.fd?.numberOfAnalystOpinions) ?? 0 },
  { key: 'newsSentiment', family: 'sentiment', label: 'Tonalité de la presse (30 jours)', dir: 1, fmt: 'num', compute: (c) => (c.news?.count ? c.news.score : null) },
  { key: 'institutionalOwnership', family: 'sentiment', label: 'Part détenue par les investisseurs institutionnels', dir: 1, fmt: 'pct',
    compute: (c) => num(c.mh?.institutionsPercentHeld ?? c.dks?.heldPercentInstitutions) },
];

if (VARIABLES.length !== 50) throw new Error(`Score Fluxora : ${VARIABLES.length} variables au lieu de 50`);

// Indicateurs de cours à partir des clôtures quotidiennes sur ~1 an
function priceMetrics(closes) {
  const c = (closes || []).filter((v) => num(v) != null && v > 0);
  if (c.length < 60) return {};
  const last = c[c.length - 1];
  const rets = c.slice(1).map((v, i) => Math.log(v / c[i]));
  const mean = rets.reduce((s, r) => s + r, 0) / rets.length;
  const vol = Math.sqrt(rets.reduce((s, r) => s + (r - mean) ** 2, 0) / (rets.length - 1)) * Math.sqrt(252);
  const neg = rets.filter((r) => r < 0);
  const dvol = neg.length > 5 ? Math.sqrt(neg.reduce((s, r) => s + r * r, 0) / neg.length) * Math.sqrt(252) : null;
  let peak = c[0]; let mdd = 0;
  for (const v of c) { peak = Math.max(peak, v); mdd = Math.min(mdd, v / peak - 1); }
  const avg = (arr) => arr.reduce((s, v) => s + v, 0) / arr.length;
  const ago = (n) => c[Math.max(c.length - 1 - n, 0)];
  const ma200 = c.length >= 200 ? avg(c.slice(-200)) : null;
  const ma50 = avg(c.slice(-50));
  return {
    volatility: vol,
    downsideVolatility: dvol,
    maxDrawdown: mdd,
    momentum12_1: c.length >= 240 ? ago(21) / c[0] - 1 : null,
    momentum6: ago(0) / ago(126) - 1,
    priceVsMa200: ma200 ? last / ma200 - 1 : null,
    ma50VsMa200: ma200 ? ma50 / ma200 - 1 : null,
    fromHigh: last / Math.max(...c) - 1,
  };
}

// Banques et assurances : les ratios de marge brute, d'EBITDA, de dette et de liquidité n'ont pas de sens
// (leur métier est de porter de la dette et des dépôts) — ces variables sont ignorées pour elles.
const isFinancial = (sector) => /financ|bank|banque|insurance|assurance/i.test(String(sector || ''));

module.exports = { FAMILIES, VARIABLES, priceMetrics, isFinancial };
