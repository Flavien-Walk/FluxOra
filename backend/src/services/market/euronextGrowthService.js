/**
 * Euronext Growth — liste des sociétés cotées et cours (différés).
 *
 * Sources :
 *  - Liste des instruments + dernier cours de clôture : export CSV public de live.euronext.com
 *    (référentiel rafraîchi toutes les 6 h).
 *  - Cours en séance : Yahoo Finance, différé de 15 minutes (cache 60 s).
 *
 * ⚠️ Le vrai temps réel Euronext nécessite une licence de données payante (Euronext Market Data).
 *    Ces données sont fournies à titre indicatif ; un usage commercial exige de vérifier
 *    les conditions d'utilisation d'Euronext et de Yahoo.
 */
const { yahoo } = require('./yahooClient');

// Marchés Euronext Growth : code MIC → suffixe Yahoo
const MARKETS = {
  ALXP: { label: 'Paris', yahooSuffix: '.PA' },
  EXGM: { label: 'Milan', yahooSuffix: '.MI' },
  MERK: { label: 'Oslo', yahooSuffix: '.OL' },
  XESM: { label: 'Dublin', yahooSuffix: '.IR' },
  ALXB: { label: 'Bruxelles', yahooSuffix: '.BR' },
  ALXL: { label: 'Lisbonne', yahooSuffix: '.LS' },
};

const CSV_URL = `https://live.euronext.com/en/pd_es/data/stocks/download?mics=${Object.keys(MARKETS).join('%2C')}`
  + '&initialLetter=&fe_type=csv&fe_decimal_separator=.&fe_date_format=d%2Fm%2FY';

const UNIVERSE_TTL = 6 * 60 * 60 * 1000; // référentiel : 6 h
const QUOTES_TTL = 60 * 1000;           // cours : 60 s
const YAHOO_BATCH = 50;

let universe = { at: 0, list: [], promise: null };
let quotes = { at: 0, bySymbol: new Map(), promise: null };

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

// « Euronext Growth Paris, Brussels » → première place de cotation
const marketFromLabel = (label) => {
  const place = String(label).replace('Euronext Growth', '').split(',')[0].trim();
  const map = { Paris: 'ALXP', Milan: 'EXGM', Oslo: 'MERK', Dublin: 'XESM', Brussels: 'ALXB', Lisbon: 'ALXL' };
  return map[place] || null;
};

function parseDate(ddmmyyyy) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?/.exec(ddmmyyyy || '');
  if (!m) return null;
  return new Date(Date.UTC(+m[3], +m[2] - 1, +m[1], m[4] ? +m[4] : 0, m[5] ? +m[5] : 0));
}

async function fetchUniverse() {
  const res = await fetch(CSV_URL, { headers: { 'User-Agent': 'Mozilla/5.0 (Fluxora)' }, signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`Euronext ${res.status}`);
  const text = (await res.text()).replace(/^﻿/, '');
  const lines = text.split(/\r?\n/).filter(Boolean);
  const header = splitCsvLine(lines[0]);
  const idx = (name) => header.findIndex((h) => h.toLowerCase() === name.toLowerCase());
  const col = {
    name: idx('Name'), isin: idx('ISIN'), symbol: idx('Symbol'), market: idx('Market'), currency: idx('Currency'),
    last: idx('last Price'), time: idx('last Trade MIC Time'), volume: idx('Volume'), turnover: idx('Turnover'),
    close: idx('Closing Price'), open: idx('Open Price'),
  };
  const seen = new Set();
  const list = [];
  for (const line of lines.slice(1)) {
    const c = splitCsvLine(line);
    if (c.length < header.length || !/^[A-Z]{2}[A-Z0-9]{10}$/.test(c[col.isin])) continue; // lignes d'en-tête Euronext
    const mic = marketFromLabel(c[col.market]);
    if (!mic) continue;
    const key = `${c[col.isin]}-${mic}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const last = num(c[col.last]) ?? num(c[col.close]);
    list.push({
      isin: c[col.isin],
      name: c[col.name],
      symbol: c[col.symbol],
      mic,
      market: MARKETS[mic].label,
      currency: c[col.currency] || 'EUR',
      yahooSymbol: `${c[col.symbol]}${MARKETS[mic].yahooSuffix}`,
      eod: {
        price: last,
        volume: num(c[col.volume]),
        turnover: num(c[col.turnover]),
        time: parseDate(c[col.time]),
      },
    });
  }
  if (!list.length) throw new Error('Liste Euronext vide');
  return list.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
}

async function getUniverse() {
  if (universe.list.length && Date.now() - universe.at < UNIVERSE_TTL) return universe.list;
  if (!universe.promise) {
    universe.promise = fetchUniverse()
      .then((list) => { universe = { at: Date.now(), list, promise: null }; return list; })
      .catch((err) => {
        universe.promise = null;
        console.error('[EuronextGrowth] référentiel :', err.message);
        if (universe.list.length) return universe.list; // on garde la dernière version connue
        throw err;
      });
  }
  return universe.promise;
}

async function fetchQuotes(list) {
  const bySymbol = new Map();
  for (let i = 0; i < list.length; i += YAHOO_BATCH) {
    const batch = list.slice(i, i + YAHOO_BATCH).map((s) => s.yahooSymbol);
    try {
      const result = await yahoo.quote(batch, {}, { validateResult: false });
      for (const q of [].concat(result || [])) {
        if (q?.symbol && q.regularMarketPrice != null) bySymbol.set(q.symbol, q);
      }
    } catch (err) {
      console.error('[EuronextGrowth] Yahoo lot', i / YAHOO_BATCH, ':', err.message);
    }
  }
  return bySymbol;
}

async function getQuotes(list) {
  if (quotes.bySymbol.size && Date.now() - quotes.at < QUOTES_TTL) return quotes.bySymbol;
  if (!quotes.promise) {
    quotes.promise = fetchQuotes(list)
      .then((bySymbol) => { quotes = { at: Date.now(), bySymbol, promise: null }; return bySymbol; })
      .catch(() => { quotes.promise = null; return quotes.bySymbol; });
  }
  // Première fois : on attend ; ensuite on sert l'ancien cache pendant le rafraîchissement
  return quotes.bySymbol.size ? quotes.bySymbol : quotes.promise;
}

// Fusionne référentiel Euronext et cours Yahoo (le plus récent l'emporte)
function merge(stock, q) {
  if (q) {
    return {
      ...stock,
      price: q.regularMarketPrice,
      change: q.regularMarketChange ?? null,
      changePercent: q.regularMarketChangePercent ?? null,
      volume: q.regularMarketVolume ?? stock.eod.volume,
      marketCap: q.marketCap ?? null,
      dayHigh: q.regularMarketDayHigh ?? null,
      dayLow: q.regularMarketDayLow ?? null,
      previousClose: q.regularMarketPreviousClose ?? null,
      time: q.regularMarketTime ? new Date(q.regularMarketTime) : null,
      marketState: q.marketState || null,
      source: 'yahoo',
      delayMinutes: q.exchangeDataDelayedBy ?? 15,
    };
  }
  return {
    ...stock,
    price: stock.eod.price,
    change: null,
    changePercent: null, // pas de clôture précédente fiable dans l'export Euronext
    volume: stock.eod.volume,
    marketCap: null,
    time: stock.eod.time,
    marketState: null,
    source: 'euronext',
    delayMinutes: null, // cours de clôture de la dernière séance
  };
}

const SORTS = {
  name: (a, b) => a.name.localeCompare(b.name, 'fr'),
  change: (a, b) => (b.changePercent ?? -Infinity) - (a.changePercent ?? -Infinity),
  changeAsc: (a, b) => (a.changePercent ?? Infinity) - (b.changePercent ?? Infinity),
  volume: (a, b) => ((b.volume ?? 0) * (b.price ?? 0)) - ((a.volume ?? 0) * (a.price ?? 0)),
  marketCap: (a, b) => (b.marketCap ?? -1) - (a.marketCap ?? -1),
};

/**
 * Liste filtrée / triée / paginée.
 * @param {{ q?: string, market?: string, sort?: string, page?: number, limit?: number }} opts
 */
async function listStocks({ q = '', market = '', sort = 'name', page = 1, limit = 50 } = {}) {
  const list = await getUniverse();
  const bySymbol = await getQuotes(list);
  const query = q.trim().toLowerCase();
  let rows = list
    .filter((s) => !market || s.mic === market)
    .filter((s) => !query || s.name.toLowerCase().includes(query) || s.symbol.toLowerCase().includes(query) || s.isin.toLowerCase().includes(query))
    .map((s) => merge(s, bySymbol.get(s.yahooSymbol)));
  rows.sort(SORTS[sort] || SORTS.name);

  const all = list.map((s) => merge(s, bySymbol.get(s.yahooSymbol)));
  const withChange = all.filter((s) => s.changePercent != null);
  const summary = {
    total: list.length,
    live: all.filter((s) => s.source === 'yahoo').length,
    up: withChange.filter((s) => s.changePercent > 0).length,
    down: withChange.filter((s) => s.changePercent < 0).length,
    markets: Object.entries(MARKETS).map(([mic, m]) => ({ mic, label: m.label, count: list.filter((s) => s.mic === mic).length })).filter((m) => m.count),
  };

  const safeLimit = Math.min(Math.max(Number(limit) || 50, 10), 200);
  const safePage = Math.max(Number(page) || 1, 1);
  return {
    stocks: rows.slice((safePage - 1) * safeLimit, safePage * safeLimit),
    count: rows.length,
    page: safePage,
    pages: Math.max(Math.ceil(rows.length / safeLimit), 1),
    summary,
    quotesUpdatedAt: quotes.at ? new Date(quotes.at) : null,
    universeUpdatedAt: universe.at ? new Date(universe.at) : null,
  };
}

// Détail + historique (graphique) d'une valeur
async function getStock(isin, range = '1mo') {
  const list = await getUniverse();
  const stock = list.find((s) => s.isin === isin);
  if (!stock) return null;
  const bySymbol = await getQuotes(list);
  const RANGES = { '5d': [5, '30m'], '1mo': [31, '1d'], '6mo': [183, '1d'], '1y': [366, '1wk'] };
  const [days, interval] = RANGES[range] || RANGES['1mo'];
  let history = [];
  try {
    const chart = await yahoo.chart(stock.yahooSymbol, { period1: new Date(Date.now() - days * 86400_000), interval }, { validateResult: false });
    history = (chart?.quotes || []).filter((p) => p.close != null).map((p) => ({ date: p.date, close: p.close }));
  } catch (err) {
    console.error('[EuronextGrowth] historique', stock.yahooSymbol, ':', err.message);
  }
  return { ...merge(stock, bySymbol.get(stock.yahooSymbol)), history, range };
}

module.exports = { listStocks, getStock, getUniverse, MARKETS };
