const MarketRate = require('../models/MarketRate');

// ─── Produits disponibles (catalogue statique enrichi de taux dynamiques) ─────
const PRODUCTS = [
  {
    id: 'money-market',
    name: 'Fonds Monétaire EUR',
    description: 'Placement ultra-liquide indexé sur l\'€STR. Capital non garanti mais risque quasi nul.',
    ticker: 'XEON.DE',
    rateSource: 'estr',
    rateBonus: 0.5, // spread moyen au-dessus de l'€STR
    risk: 1,
    riskLabel: 'Très faible',
    liquidity: 'J+1',
    minAmount: 1000,
    horizon: 'Court terme',
    partner: 'DWS / Xtrackers',
    category: 'Monétaire',
    color: '#2563EB'
  },
  {
    id: 'short-bond',
    name: 'Obligations Court Terme',
    description: 'ETF sur obligations d\'État zone euro de moins de 6 mois. Très sécurisé, rendement légèrement supérieur au monétaire.',
    ticker: 'C3M.PA',
    rateSource: 'aaa3m',
    rateBonus: 0,
    risk: 2,
    riskLabel: 'Faible',
    liquidity: 'J+2',
    minAmount: 2000,
    horizon: 'Court terme',
    partner: 'Amundi ETF',
    category: 'Obligataire',
    color: '#059669'
  },
  {
    id: 'oat-1-3y',
    name: 'OAT 1-3 ans (Zone Euro)',
    description: 'Exposition aux obligations d\'État de la zone euro à horizon 1-3 ans. Idéal pour une tréso non utilisée avant 12 mois.',
    ticker: 'CSH2.PA',
    rateSource: 'aaa1y',
    rateBonus: 0.2,
    risk: 2,
    riskLabel: 'Faible',
    liquidity: 'J+3',
    minAmount: 5000,
    horizon: 'Moyen terme',
    partner: 'iShares / BlackRock',
    category: 'Obligataire',
    color: '#7C3AED'
  },
  {
    id: 'cat',
    name: 'Compte à Terme',
    description: 'Taux fixe garanti sur une durée déterminée (3, 6 ou 12 mois). Capital 100% sécurisé, rendement prédéfini.',
    ticker: null,
    rateSource: 'fixed',
    fixedRate: 3.0,
    rateBonus: 0,
    risk: 1,
    riskLabel: 'Nul',
    liquidity: 'À maturité',
    minAmount: 10000,
    horizon: 'Moyen terme',
    partner: 'Banque partenaire',
    category: 'Épargne',
    color: '#D97706'
  }
];

// ─── Fetch €STR depuis ECB ─────────────────────────────────────────────────────
async function fetchECBRate(seriesKey) {
  try {
    const url = `https://data-api.ecb.europa.eu/service/data/${seriesKey}?lastNObservations=1&format=csvdata`;
    const res = await fetch(url, {
      headers: { Accept: 'text/csv' },
      signal: AbortSignal.timeout(10000)
    });
    if (!res.ok) return null;
    const text = await res.text();
    // Format CSV : header + data lines. La valeur est la dernière colonne de la dernière ligne.
    const lines = text.trim().split('\n').filter(l => l && !l.startsWith('KEY'));
    if (!lines.length) return null;
    const cols = lines[lines.length - 1].split(',');
    const value = parseFloat(cols[cols.length - 1]);
    return isNaN(value) ? null : value;
  } catch {
    return null;
  }
}

// ─── Fetch NAV ETF depuis yahoo-finance2 ──────────────────────────────────────
async function fetchETFPrice(ticker) {
  try {
    const yf = require('yahoo-finance2').default;
    const quote = await yf.quote(ticker, {}, { validateResult: false });
    return {
      price: quote.regularMarketPrice || null,
      changePercent: quote.regularMarketChangePercent || null
    };
  } catch {
    return { price: null, changePercent: null };
  }
}

// ─── Mise à jour quotidienne ───────────────────────────────────────────────────
async function updateMarketRates() {
  const today = new Date().toISOString().split('T')[0];
  const existing = await MarketRate.findOne({ date: today });
  if (existing) return existing; // déjà à jour aujourd'hui

  console.log('[MarketData] Fetching market rates for', today);

  const [estr, aaa3m, aaa1y, aaa2y] = await Promise.all([
    fetchECBRate('EST/B.EU000A2X2A25.WT'),
    fetchECBRate('YC/B.U2.EUR.4F.G_N_W.SV_C_YM.SR_3M'),
    fetchECBRate('YC/B.U2.EUR.4F.G_N_A.SV_C_YM.SR_1Y'),
    fetchECBRate('YC/B.U2.EUR.4F.G_N_A.SV_C_YM.SR_2Y')
  ]);

  const [xeon, csh2, c3m] = await Promise.all([
    fetchETFPrice('XEON.DE'),
    fetchETFPrice('CSH2.PA'),
    fetchETFPrice('C3M.PA')
  ]);

  const snapshot = {
    date: today,
    estr: estr,
    aaa3m: aaa3m,
    aaa1y: aaa1y,
    aaa3y: aaa2y ? parseFloat((aaa2y + 0.1).toFixed(3)) : null, // interpolation simple 2Y→3Y
    etfs: {
      'XEON.DE': xeon,
      'CSH2.PA': csh2,
      'C3M.PA': c3m
    },
    fetchedAt: new Date()
  };

  await MarketRate.findOneAndUpdate({ date: today }, snapshot, { upsert: true, new: true });
  console.log('[MarketData] Rates updated:', { estr, aaa3m, aaa1y });
  return snapshot;
}

// ─── Récupère le dernier snapshot dispo (avec fallback) ───────────────────────
async function getLatestRates() {
  const latest = await MarketRate.findOne().sort({ date: -1 }).lean();
  if (latest) return latest;
  // Fallback statique si aucune donnée en base (premier démarrage)
  return {
    date: new Date().toISOString().split('T')[0],
    estr: 1.93,
    aaa3m: 2.01,
    aaa1y: 2.47,
    aaa3y: 2.57,
    etfs: { 'XEON.DE': {}, 'CSH2.PA': {}, 'C3M.PA': {} },
    isFallback: true
  };
}

// ─── Enrichit les produits avec les taux actuels ───────────────────────────────
async function getProductsWithRates() {
  const rates = await getLatestRates();
  return PRODUCTS.map(p => {
    let currentRate;
    if (p.rateSource === 'fixed') {
      currentRate = p.fixedRate;
    } else {
      const base = rates[p.rateSource] ?? 1.93;
      currentRate = parseFloat((base + p.rateBonus).toFixed(2));
    }
    return { ...p, currentRate, ratesDate: rates.date, isFallback: rates.isFallback || false };
  });
}

module.exports = { updateMarketRates, getLatestRates, getProductsWithRates, PRODUCTS };
