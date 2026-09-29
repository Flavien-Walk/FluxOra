/**
 * Marchés actions Euronext — Euronext Paris (marché réglementé) et Euronext Growth.
 *
 * Sources :
 *  - Liste des sociétés + dernier cours de clôture : export CSV public de live.euronext.com
 *    (référentiel rafraîchi toutes les 6 h).
 *  - Cours en séance, capitalisation et nom complet : Yahoo Finance, différé de 15 minutes (cache 60 s).
 *
 * Classement « Top 40 / 120 / 200 » : calculé en direct sur la capitalisation boursière.
 * Il approche le CAC 40 et le SBF 120 sans s'y substituer (la composition officielle des indices
 * dépend aussi du flottant et de la liquidité, et n'est pas diffusée librement par Euronext).
 *
 * ⚠️ Le vrai temps réel nécessite une licence de données payante (Euronext Market Data).
 *    Données fournies à titre indicatif ; un usage commercial exige de vérifier les conditions
 *    d'utilisation d'Euronext et de Yahoo.
 */
const { yahoo } = require('./yahooClient');
const MarketRef = require('../../models/MarketRef');

// Places de cotation : code MIC → libellé et suffixe Yahoo
const MARKETS = {
  XPAR: { label: 'Paris', yahooSuffix: '.PA' },
  ALXP: { label: 'Paris', yahooSuffix: '.PA' },
  EXGM: { label: 'Milan', yahooSuffix: '.MI' },
  MERK: { label: 'Oslo', yahooSuffix: '.OL' },
  XESM: { label: 'Dublin', yahooSuffix: '.IR' },
  ALXB: { label: 'Bruxelles', yahooSuffix: '.BR' },
  ALXL: { label: 'Lisbonne', yahooSuffix: '.LS' },
};

const GROWTH_PLACES = { Paris: 'ALXP', Milan: 'EXGM', Oslo: 'MERK', Dublin: 'XESM', Brussels: 'ALXB', Lisbon: 'ALXL' };

// Segments proposés dans l'application
const SEGMENTS = {
  paris: {
    label: 'Euronext Paris',
    mics: ['XPAR'],
    resolveMic: (label) => (/Paris/.test(label) ? 'XPAR' : null),
  },
  growth: {
    label: 'Euronext Growth',
    mics: ['ALXP', 'EXGM', 'MERK', 'XESM', 'ALXB', 'ALXL'],
    // « Euronext Growth Paris, Brussels » → première place de cotation
    resolveMic: (label) => GROWTH_PLACES[String(label).replace('Euronext Growth', '').split(',')[0].trim()] || null,
  },
};

const csvUrl = (mics) => `https://live.euronext.com/en/pd_es/data/stocks/download?mics=${mics.join('%2C')}`
  + '&initialLetter=&fe_type=csv&fe_decimal_separator=.&fe_date_format=d%2Fm%2FY';

const UNIVERSE_TTL = 6 * 60 * 60 * 1000; // référentiel : 6 h
const QUOTES_TTL = 60 * 1000;           // cours : 60 s
const YAHOO_BATCH = 50;

// Cache par segment
const cache = Object.fromEntries(Object.keys(SEGMENTS).map((k) => [k, {
  universe: { at: 0, list: [], promise: null },
  quotes: { at: 0, bySymbol: new Map(), promise: null },
  refs: { at: 0, bySymbol: new Map() },
}]));

// Références (nom, nombre d'actions) : sauvegardées après un succès Yahoo, relues au besoin (secours)
async function saveRefs(bySymbol, list) {
  const isinBySymbol = new Map(list.map((s) => [s.yahooSymbol, s.isin]));
  const ops = [...bySymbol.values()].map((q) => ({
    updateOne: {
      filter: { yahooSymbol: q.symbol },
      update: { $set: {
        yahooSymbol: q.symbol, isin: isinBySymbol.get(q.symbol), longName: q.longName, shortName: q.shortName,
        sharesOutstanding: q.sharesOutstanding, marketCap: q.marketCap, currency: q.currency, fxToEur: q.fxToEur, updatedAt: new Date(),
      } },
      upsert: true,
    },
  }));
  if (ops.length) await MarketRef.bulkWrite(ops, { ordered: false }).catch((e) => console.error('[Marchés] références :', e.message));
}

async function getRefs(segmentKey, list) {
  const rc = cache[segmentKey].refs;
  if (rc.bySymbol.size && Date.now() - rc.at < 30 * 60_000) return rc.bySymbol;
  try {
    const docs = await MarketRef.find({ yahooSymbol: { $in: list.map((s) => s.yahooSymbol) } }).lean();
    rc.bySymbol = new Map(docs.map((d) => [d.yahooSymbol, d]));
    rc.at = Date.now();
  } catch { /* base indisponible */ }
  return rc.bySymbol;
}

const num = (v) => {
  const n = parseFloat(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

// Découpe une ligne CSV « ; » avec guillemets
function splitCsvLine(line) {
  const out = []; let cur = ''; let quoted = false;
  for (const ch of line) {
    if (ch === '"') quoted = !quoted;
    else if (ch === ';' && !quoted) { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

function parseDate(ddmmyyyy) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?/.exec(ddmmyyyy || '');
  if (!m) return null;
  return new Date(Date.UTC(+m[3], +m[2] - 1, +m[1], m[4] ? +m[4] : 0, m[5] ? +m[5] : 0));
}

// « CREDIT AGRICOLE » → « Credit Agricole » (secours si Yahoo ne fournit pas le nom)
const titleCase = (s) => String(s).toLowerCase().replace(/(^|[\s\-'.&/(])([a-zà-ÿ])/g, (m, p, c) => p + c.toUpperCase());

// « Crédit Agricole S.A. » → « Crédit Agricole » ; « LVMH …, Société Européenne » → « LVMH … »
const LEGAL_FORM = /(,?\s+(société en commandite par actions|société européenne|société anonyme|société coopérative|limited|corporation|corp\.?|s\.?\s?a\.?|s\.?e\.?|s\.?c\.?a\.?|n\.?v\.?|s\.?p\.?a\.?|asa|as|a\/s|ab|plc|ltd\.?|inc\.?|ag|se))+\.?$/i;
const cleanName = (s) => String(s || '').replace(LEGAL_FORM, '').replace(/\s{2,}/g, ' ').trim();

async function fetchUniverse(segmentKey) {
  const seg = SEGMENTS[segmentKey];
  const res = await fetch(csvUrl(seg.mics), { headers: { 'User-Agent': 'Mozilla/5.0 (Fluxora)' }, signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`Euronext ${res.status}`);
  const text = (await res.text()).replace(/^﻿/, '');
  const lines = text.split(/\r?\n/).filter(Boolean);
  const header = splitCsvLine(lines[0]);
  const idx = (name) => header.findIndex((h) => h.toLowerCase() === name.toLowerCase());
  const col = {
    name: idx('Name'), isin: idx('ISIN'), symbol: idx('Symbol'), market: idx('Market'), currency: idx('Currency'),
    last: idx('last Price'), time: idx('last Trade MIC Time'), volume: idx('Volume'), close: idx('Closing Price'),
  };
  const seen = new Set();
  const list = [];
  for (const line of lines.slice(1)) {
    const c = splitCsvLine(line);
    if (c.length < header.length || !/^[A-Z]{2}[A-Z0-9]{10}$/.test(c[col.isin])) continue; // lignes d'en-tête Euronext
    const mic = seg.resolveMic(c[col.market]);
    if (!mic) continue;
    const key = `${c[col.isin]}-${mic}`;
    if (seen.has(key)) continue;
    seen.add(key);
    list.push({
      isin: c[col.isin],
      rawName: c[col.name],
      name: titleCase(c[col.name]),
      symbol: c[col.symbol],
      mic,
      segment: segmentKey,
      market: MARKETS[mic].label,
      currency: c[col.currency] || 'EUR',
      yahooSymbol: `${c[col.symbol]}${MARKETS[mic].yahooSuffix}`,
      eod: {
        price: num(c[col.last]) ?? num(c[col.close]),
        volume: num(c[col.volume]),
        time: parseDate(c[col.time]),
      },
    });
  }
  if (!list.length) throw new Error('Liste Euronext vide');
  return list;
}

async function getUniverse(segmentKey) {
  const u = cache[segmentKey].universe;
  if (u.list.length && Date.now() - u.at < UNIVERSE_TTL) return u.list;
  if (!u.promise) {
    u.promise = fetchUniverse(segmentKey)
      .then((list) => { Object.assign(u, { at: Date.now(), list, promise: null }); return list; })
      .catch((err) => {
        u.promise = null;
        console.error(`[Marchés] référentiel ${segmentKey} :`, err.message);
        if (u.list.length) return u.list; // dernière version connue
        throw err;
      });
  }
  return u.promise;
}

// Taux de change vers l'euro (ex. NOKEUR=X) pour comparer les capitalisations
async function fetchFxToEur(currencies) {
  const rates = { EUR: 1 };
  const others = currencies.filter((c) => c && c !== 'EUR');
  if (!others.length) return rates;
  try {
    const res = await yahoo.quote(others.map((c) => `${c}EUR=X`), {}, { validateResult: false });
    for (const q of [].concat(res || [])) {
      const cur = q?.symbol?.slice(0, 3);
      if (cur && q.regularMarketPrice) rates[cur] = q.regularMarketPrice;
    }
  } catch (err) {
    console.error('[Marchés] taux de change :', err.message);
  }
  return rates;
}

// Diagnostic exposé par /api/health
const health = { lastSuccessAt: null, lastErrorAt: null, lastError: null, failedBatches: 0, blockedUntil: null };
const BLOCK_PAUSE = 5 * 60_000; // disjoncteur : pause après une limitation (429)
const sleepMs = (ms) => new Promise((r) => setTimeout(r, ms));

async function quoteBatch(batch) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await yahoo.quote(batch, {}, { validateResult: false });
    } catch (err) {
      Object.assign(health, { lastErrorAt: new Date(), lastError: err.message });
      if (/429|too many/i.test(err.message)) { health.blockedUntil = new Date(Date.now() + BLOCK_PAUSE); throw err; }
      if (attempt === 3) throw err;
      await sleepMs(1500 * attempt); // attente croissante avant nouvel essai (limitation de débit)
    }
  }
  return [];
}

async function fetchQuotes(list) {
  const bySymbol = new Map();
  for (let i = 0; i < list.length; i += YAHOO_BATCH) {
    const batch = list.slice(i, i + YAHOO_BATCH).map((s) => s.yahooSymbol);
    try {
      const result = await quoteBatch(batch);
      for (const q of [].concat(result || [])) {
        if (q?.symbol && q.regularMarketPrice != null) bySymbol.set(q.symbol, q);
      }
    } catch (err) {
      health.failedBatches++;
      console.error('[Marchés] Yahoo lot', i / YAHOO_BATCH, ':', err.message);
      if (health.blockedUntil && Date.now() < health.blockedUntil.getTime()) break; // inutile d'insister
    }
  }
  if (bySymbol.size) health.lastSuccessAt = new Date();
  // Capitalisation convertie en euros pour le classement
  const rates = await fetchFxToEur([...new Set([...bySymbol.values()].map((q) => q.currency))]);
  for (const q of bySymbol.values()) {
    const rate = rates[q.currency];
    q.fxToEur = rate || null;
    q.marketCapEur = q.marketCap && rate ? q.marketCap * rate : null;
  }
  return bySymbol;
}

async function getQuotes(segmentKey, list) {
  const qc = cache[segmentKey].quotes;
  if (qc.bySymbol.size && Date.now() - qc.at < QUOTES_TTL) return qc.bySymbol;
  // Yahoo en pause (limitation) : secours immédiat (cours Euronext + références mémorisées)
  if (health.blockedUntil && Date.now() < health.blockedUntil.getTime()) return qc.bySymbol;
  if (!qc.promise) {
    qc.promise = fetchQuotes(list)
      .then((fresh) => {
        // Fusion : les valeurs absentes de la nouvelle réponse gardent leur dernier cours connu
        const merged = new Map(qc.bySymbol);
        for (const [k, v] of fresh) merged.set(k, v);
        // Échec massif (limitation Yahoo) : on garde l'ancien cache et on réessaie plus vite
        const ok = fresh.size >= Math.min(qc.bySymbol.size, list.length) * 0.5;
        if (fresh.size && Date.now() - (qc.refsSavedAt || 0) > 6 * 3600_000) {
          qc.refsSavedAt = Date.now();
          saveRefs(fresh, list);
        }
        Object.assign(qc, { at: ok ? Date.now() : Date.now() - QUOTES_TTL + 15_000, bySymbol: merged, promise: null });
        return merged;
      })
      .catch(() => { qc.promise = null; return qc.bySymbol; });
  }
  // Première fois : on attend au plus 8 s ; ensuite on sert l'ancien cache pendant le rafraîchissement
  if (qc.bySymbol.size) return qc.bySymbol;
  return Promise.race([qc.promise, new Promise((r) => setTimeout(() => r(qc.bySymbol), 8000))]);
}

// Fusionne référentiel Euronext et cours Yahoo
function merge(stock, q, ref) {
  if (q) {
    return {
      ...stock,
      name: cleanName(q.longName) || cleanName(q.shortName) || stock.name,
      price: q.regularMarketPrice,
      change: q.regularMarketChange ?? null,
      changePercent: q.regularMarketChangePercent ?? null,
      volume: q.regularMarketVolume ?? stock.eod.volume,
      marketCap: q.marketCap ?? null,
      marketCapCurrency: q.currency || stock.currency,
      marketCapEur: q.marketCapEur ?? null,
      fxToEur: q.fxToEur ?? (stock.currency === 'EUR' ? 1 : null),
      priceEur: q.fxToEur ? q.regularMarketPrice * q.fxToEur : null,
      dayHigh: q.regularMarketDayHigh ?? null,
      dayLow: q.regularMarketDayLow ?? null,
      previousClose: q.regularMarketPreviousClose ?? null,
      time: q.regularMarketTime ? new Date(q.regularMarketTime) : null,
      source: 'yahoo',
      delayMinutes: q.exchangeDataDelayedBy ?? 15,
    };
  }
  // Secours : cours Euronext ; nom et capitalisation reconstitués depuis les références mémorisées
  const fx = ref?.fxToEur ?? (stock.currency === 'EUR' ? 1 : null);
  const cap = ref?.sharesOutstanding && stock.eod.price ? ref.sharesOutstanding * stock.eod.price : ref?.marketCap ?? null;
  return {
    ...stock,
    name: cleanName(ref?.longName) || cleanName(ref?.shortName) || stock.name,
    price: stock.eod.price,
    change: null,
    changePercent: null, // pas de clôture précédente fiable dans l'export Euronext
    volume: stock.eod.volume,
    marketCap: cap,
    marketCapCurrency: ref?.currency || stock.currency,
    marketCapEur: cap && fx ? cap * fx : null,
    fxToEur: fx,
    priceEur: fx && stock.eod.price ? stock.eod.price * fx : null,
    time: stock.eod.time,
    source: 'euronext',
    delayMinutes: null,
  };
}

// Toutes les valeurs d'un segment, fusionnées et classées par capitalisation (rang 1 = la plus grosse)
async function getSegmentStocks(segmentKey) {
  const list = await getUniverse(segmentKey);
  const [bySymbol, refs] = await Promise.all([getQuotes(segmentKey, list), getRefs(segmentKey, list)]);
  const all = list.map((s) => merge(s, bySymbol.get(s.yahooSymbol), refs.get(s.yahooSymbol)));
  [...all].filter((s) => s.marketCapEur).sort((a, b) => b.marketCapEur - a.marketCapEur).forEach((s, i) => { s.rank = i + 1; });
  return all;
}

// Tri par colonne : valeur à comparer ; sens croissant ou décroissant, valeurs manquantes toujours en fin de liste
const SORT_VALUES = {
  marketCap: (s) => s.marketCapEur,
  score: (s) => s.score,
  change: (s) => s.changePercent,
  price: (s) => s.priceEur ?? s.price,
  volume: (s) => (s.volume != null && s.price != null ? s.volume * (s.priceEur ?? s.price) : null),
  time: (s) => (s.time ? new Date(s.time).getTime() : null),
  name: (s) => s.name,
};
const DEFAULT_ORDER = { name: 'asc' }; // les autres colonnes : décroissant par défaut

function comparator(sort, order) {
  const get = SORT_VALUES[sort] || SORT_VALUES.marketCap;
  const dir = (order || DEFAULT_ORDER[sort] || 'desc') === 'asc' ? 1 : -1;
  return (a, b) => {
    const va = get(a); const vb = get(b);
    const na = va == null || Number.isNaN(va); const nb = vb == null || Number.isNaN(vb);
    if (na || nb) return na === nb ? 0 : na ? 1 : -1;
    return (typeof va === 'string' ? va.localeCompare(vb, 'fr') : va - vb) * dir;
  };
}

const TOPS = [40, 120, 200];

// Scores du conseiller (injectés au démarrage pour éviter une dépendance circulaire)
let scoreProvider = () => new Map();
const setScoreProvider = (fn) => { scoreProvider = fn; };

/**
 * Liste filtrée / triée / paginée.
 * @param {{ segment?: string, q?: string, market?: string, top?: number, sort?: string, order?: 'asc'|'desc', page?: number, limit?: number }} opts
 */
async function listStocks({ segment = 'growth', q = '', market = '', top, sort = 'marketCap', order, page = 1, limit = 50 } = {}) {
  if (sort === 'changeAsc') { sort = 'change'; order = 'asc'; } // ancien libellé de tri
  const segmentKey = SEGMENTS[segment] ? segment : 'growth';
  const all = await getSegmentStocks(segmentKey);
  const topN = TOPS.includes(Number(top)) ? Number(top) : null;
  const query = q.trim().toLowerCase();

  const scores = scoreProvider();
  all.forEach((s) => { s.score = scores.get(s.isin) ?? null; });
  const rows = all
    .filter((s) => !market || s.mic === market)
    .filter((s) => !topN || (s.rank && s.rank <= topN))
    .filter((s) => !query || s.name.toLowerCase().includes(query) || s.rawName.toLowerCase().includes(query)
      || s.symbol.toLowerCase().includes(query) || s.isin.toLowerCase().includes(query))
    .sort(comparator(sort, order === 'asc' || order === 'desc' ? order : undefined));

  const withChange = all.filter((s) => s.changePercent != null);
  const places = [...new Set(all.map((s) => s.mic))];
  const summary = {
    segment: segmentKey,
    segmentLabel: SEGMENTS[segmentKey].label,
    total: all.length,
    live: all.filter((s) => s.source === 'yahoo').length,
    up: withChange.filter((s) => s.changePercent > 0).length,
    down: withChange.filter((s) => s.changePercent < 0).length,
    markets: places.map((mic) => ({ mic, label: MARKETS[mic].label, count: all.filter((s) => s.mic === mic).length }))
      .sort((a, b) => b.count - a.count),
    tops: TOPS,
  };

  const safeLimit = Math.min(Math.max(Number(limit) || 50, 10), 200);
  const safePage = Math.max(Number(page) || 1, 1);
  return {
    stocks: rows.slice((safePage - 1) * safeLimit, safePage * safeLimit),
    count: rows.length,
    page: safePage,
    pages: Math.max(Math.ceil(rows.length / safeLimit), 1),
    summary,
    quotesUpdatedAt: cache[segmentKey].quotes.at ? new Date(cache[segmentKey].quotes.at) : null,
  };
}

// Valeur au dernier cours connu (sans historique), tous segments confondus
async function findStock(isin) {
  for (const key of Object.keys(SEGMENTS)) {
    const all = await getSegmentStocks(key);
    const stock = all.find((s) => s.isin === isin);
    if (stock) return stock;
  }
  return null;
}

// Fiche valeur + historique (graphique)
async function getStock(isin, range = '1mo') {
  const stock = await findStock(isin);
  if (!stock) return null;
  const RANGES = { '5d': [5, '30m'], '1mo': [31, '1d'], '6mo': [183, '1d'], '1y': [366, '1wk'] };
  const [days, interval] = RANGES[range] || RANGES['1mo'];
  let history = [];
  try {
    const chart = await yahoo.chart(stock.yahooSymbol, { period1: new Date(Date.now() - days * 86400_000), interval }, { validateResult: false });
    history = (chart?.quotes || []).filter((p) => p.close != null).map((p) => ({ date: p.date, close: p.close }));
  } catch (err) {
    console.error('[Marchés] historique', stock.yahooSymbol, ':', err.message);
  }
  return { ...stock, history, range };
}

const getMarketHealth = () => ({
  ...health,
  quotes: Object.fromEntries(Object.entries(cache).map(([k, c]) => [k, { cached: c.quotes.bySymbol.size, universe: c.universe.list.length, at: c.quotes.at ? new Date(c.quotes.at) : null }])),
});

module.exports = { listStocks, getStock, findStock, setScoreProvider, getMarketHealth, SEGMENTS, MARKETS, cleanName, titleCase };
