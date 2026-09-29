/**
 * Presse : titres récents via le flux RSS public de Google Actualités (titre, source, date, lien).
 * Seuls les titres sont analysés (pas de reprise du contenu des articles, protégé par le droit d'auteur).
 * Tonalité : lexique financier français/anglais, score de -1 (négatif) à +1 (positif).
 */

const POSITIVE = [
  'hausse', 'bondit', 'grimpe', 'progresse', 'progression', 'record', 'relève', 'rehausse', 'surperform', 'croissance', 'bénéfice en hausse',
  'dépasse', 'meilleur', 'optimis', 'solide', 'rebond', 'acquisition', 'contrat', 'succès', 'achat', 'recommandation à l’achat', 'objectif relevé',
  'dividende en hausse', 'accélère', 'gagne', 'envol', 'renforce', 'confiance', 'résiste', 'favorable', 'upgrade', 'beats', 'surge', 'rally', 'strong',
  'raises', 'record high', 'outperform', 'buy rating', 'growth',
];
const NEGATIVE = [
  'baisse', 'chute', 'recule', 'plonge', 'dégringole', 'perte', 'pertes', 'abaisse', 'dégrade', 'avertissement', 'alerte', 'déçoit', 'décevant',
  'sous-perform', 'enquête', 'amende', 'procès', 'plainte', 'grève', 'licenciement', 'plan social', 'surendett', 'faillite', 'redressement', 'scandale',
  'rappel de produits', 'sanction', 'recul', 'ralentit', 'ralentissement', 'inquiétude', 'menace', 'recommandation à la vente', 'objectif abaissé', 'profit warning', 'downgrade',
  'miss', 'plunge', 'falls', 'lawsuit', 'fraud', 'cuts', 'weak', 'decline',
];

const decode = (s) => String(s || '')
  .replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1')
  .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, '’').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .trim();

function scoreTitle(title) {
  const t = title.toLowerCase();
  const p = POSITIVE.filter((w) => t.includes(w)).length;
  const n = NEGATIVE.filter((w) => t.includes(w)).length;
  if (!p && !n) return 0;
  return (p - n) / (p + n);
}

/**
 * @param {string} companyName nom de l'entreprise (ex. « Crédit Agricole »)
 * @returns {{ items: {title, source, link, date, sentiment}[], score: number, count: number }}
 */
async function fetchNews(companyName, { days = 30, max = 10 } = {}) {
  const q = encodeURIComponent(`"${companyName}" bourse OR action`);
  const url = `https://news.google.com/rss/search?q=${q}&hl=fr&gl=FR&ceid=FR:fr`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Fluxora)' }, signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return { items: [], score: 0, count: 0 };
    const xml = await res.text();
    const since = Date.now() - days * 86400_000;
    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => {
      const block = m[1];
      const get = (tag) => decode((new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`).exec(block) || [])[1]);
      const rawTitle = get('title');
      const source = get('source');
      const title = source && rawTitle.endsWith(` - ${source}`) ? rawTitle.slice(0, -(source.length + 3)) : rawTitle;
      return { title, source, link: get('link'), date: new Date(get('pubDate')), sentiment: scoreTitle(title) };
    })
      .filter((i) => i.title && !Number.isNaN(i.date.getTime()) && i.date.getTime() >= since)
      .sort((a, b) => b.date - a.date)
      .slice(0, max);
    const scored = items.filter((i) => i.sentiment !== 0);
    const score = scored.length ? scored.reduce((s, i) => s + i.sentiment, 0) / scored.length : 0;
    return { items, score: Math.round(score * 100) / 100, count: items.length };
  } catch {
    return { items: [], score: 0, count: 0 };
  }
}

module.exports = { fetchNews, scoreTitle };
