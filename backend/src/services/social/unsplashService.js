/**
 * Unsplash — recherche de photos libres de droits pour illustrer les posts.
 * Règles API : afficher le crédit du photographe et déclencher download_location à l'utilisation.
 */
const API = 'https://api.unsplash.com';
const UTM = 'utm_source=fluxora&utm_medium=referral';

const isConfigured = () => Boolean(process.env.UNSPLASH_ACCESS_KEY);

async function searchPhotos(query, perPage = 6) {
  if (!isConfigured() || !query) return [];
  const params = new URLSearchParams({ query, per_page: String(perPage), orientation: 'landscape', content_filter: 'high' });
  const res = await fetch(`${API}/search/photos?${params}`, {
    headers: { Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`, 'Accept-Version': 'v1' },
  });
  if (!res.ok) {
    console.error('[Unsplash] search', res.status);
    return [];
  }
  const { results = [] } = await res.json();
  return results.map((p) => ({
    url: p.urls.regular,
    thumbUrl: p.urls.small,
    alt: p.alt_description || p.description || query,
    source: 'unsplash',
    creditName: p.user?.name,
    creditUrl: `${p.user?.links?.html}?${UTM}`,
    downloadLocation: p.links?.download_location,
  }));
}

// À appeler quand une photo est réellement utilisée (publication)
// L'URL vient du client : n'envoyer la clé qu'à l'API Unsplash officielle (sinon fuite du Client-ID)
const isUnsplashApiUrl = (raw) => {
  try {
    const u = new URL(raw);
    return u.protocol === 'https:' && u.hostname === 'api.unsplash.com';
  } catch { return false; }
};

async function trackDownload(downloadLocation) {
  if (!isConfigured() || !isUnsplashApiUrl(downloadLocation)) return;
  try {
    await fetch(downloadLocation, { headers: { Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}` } });
  } catch (e) {
    console.error('[Unsplash] trackDownload', e.message);
  }
}

module.exports = { isConfigured, searchPhotos, trackDownload };
