/**
 * Score Fluxora : chaque variable est notée de 0 à 100 selon son percentile dans l'univers analysé,
 * puis agrégée par famille et pondérée. Une variable manquante est ignorée (le poids de la famille
 * est redistribué) et fait baisser l'indice de confiance.
 */
const { FAMILIES, VARIABLES, isFinancial } = require('./variables');

const r1 = (n) => Math.round(n * 10) / 10;

/** Distributions triées de chaque variable sur l'univers : { key: number[] } */
function buildDistributions(analyses) {
  const dist = {};
  for (const v of VARIABLES) {
    dist[v.key] = analyses
      .filter((a) => !(v.notForFinancials && isFinancial(a.sector)))
      .map((a) => a.values?.[v.key]).filter((x) => typeof x === 'number' && Number.isFinite(x)).sort((a, b) => a - b);
  }
  return dist;
}

// Percentile (0–100) de x dans une distribution triée
function percentile(sorted, x) {
  if (!sorted?.length) return null;
  let below = 0; let equal = 0;
  for (const v of sorted) { if (v < x) below++; else if (v === x) equal++; else break; }
  return ((below + equal / 2) / sorted.length) * 100;
}

const FORMAT = {
  pct: (v) => `${(v * 100).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %`,
  x: (v) => `${v.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}×`,
  num: (v) => v.toLocaleString('fr-FR', { maximumFractionDigits: 2 }),
  eur: (v) => new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 }).format(v) + ' €',
};

function verdict(score) {
  if (score >= 70) return { key: 'favorable', label: 'Profil favorable' };
  if (score >= 55) return { key: 'interesting', label: 'Profil intéressant' };
  if (score >= 45) return { key: 'neutral', label: 'Profil neutre' };
  return { key: 'unfavorable', label: 'Profil défavorable' };
}

/**
 * Score détaillé d'une valeur.
 * @param {object} values   variables brutes de la valeur
 * @param {object} dist     distributions de l'univers
 */
function scoreValues(values, dist, { sector } = {}) {
  const financial = isFinancial(sector);
  const variables = VARIABLES.map((v) => {
    const raw = values?.[v.key];
    const relevant = !(financial && v.notForFinancials);
    const has = relevant && typeof raw === 'number' && Number.isFinite(raw) && dist[v.key]?.length >= 5;
    const p = has ? percentile(dist[v.key], raw) : null;
    const score = p == null ? null : (v.dir === 1 ? p : 100 - p);
    return {
      key: v.key, family: v.family, label: v.label, raw: has ? raw : null, notApplicable: !relevant,
      display: has ? FORMAT[v.fmt](raw) : null, score: score == null ? null : r1(score),
    };
  });

  const families = Object.entries(FAMILIES).map(([key, f]) => {
    const vs = variables.filter((v) => v.family === key && v.score != null);
    return { key, label: f.label, weight: f.weight, score: vs.length ? r1(vs.reduce((s, v) => s + v.score, 0) / vs.length) : null,
      available: vs.length, total: variables.filter((v) => v.family === key).length };
  });
  const usable = families.filter((f) => f.score != null);
  const weightSum = usable.reduce((s, f) => s + f.weight, 0);
  const score = weightSum ? r1(usable.reduce((s, f) => s + f.score * f.weight, 0) / weightSum) : null;
  const applicable = variables.filter((v) => !v.notApplicable).length;
  const available = variables.filter((v) => v.score != null).length;

  // Points forts / faibles : variables les plus extrêmes (hors doublons de sens)
  const ranked = variables.filter((v) => v.score != null).sort((a, b) => b.score - a.score);
  const phrase = (v, strong) => {
    const better = Math.round(v.score);
    return strong
      ? `${v.label} : ${v.display} — meilleur que ${better} % des sociétés analysées.`
      : `${v.label} : ${v.display} — moins bon que ${100 - better} % des sociétés analysées.`;
  };
  return {
    score,
    verdict: score == null ? null : verdict(score),
    confidence: r1((available / applicable) * 100),
    available,
    applicable,
    financialSector: financial,
    families,
    variables,
    strengths: ranked.slice(0, 4).filter((v) => v.score >= 60).map((v) => ({ key: v.key, family: v.family, text: phrase(v, true) })),
    weaknesses: ranked.slice(-4).reverse().filter((v) => v.score <= 40).map((v) => ({ key: v.key, family: v.family, text: phrase(v, false) })),
  };
}

module.exports = { buildDistributions, scoreValues, percentile, verdict };
