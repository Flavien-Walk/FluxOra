/**
 * Garde anti-SSRF pour les URL fournies par l'utilisateur et récupérées côté serveur.
 * N'autorise que https, sur un nom d'hôte qui ne résout vers aucune adresse privée / locale.
 */
const dns = require('dns').promises;
const net = require('net');

const isPrivateIp = (ip) => {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
  }
  const v6 = ip.toLowerCase();
  if (v6.startsWith('::ffff:')) return isPrivateIp(v6.slice(7));
  return v6 === '::1' || v6 === '::' || v6.startsWith('fc') || v6.startsWith('fd') || v6.startsWith('fe80');
};

async function assertPublicHttpsUrl(raw) {
  let url;
  try { url = new URL(raw); } catch { throw new Error('URL d\'image invalide.'); }
  if (url.protocol !== 'https:') throw new Error('Seules les images en https sont acceptées.');
  if (net.isIP(url.hostname)) throw new Error('Adresse d\'image non autorisée.');
  const addresses = await dns.lookup(url.hostname, { all: true });
  if (!addresses.length || addresses.some((a) => isPrivateIp(a.address))) {
    throw new Error('Adresse d\'image non autorisée.');
  }
  return url;
}

module.exports = { assertPublicHttpsUrl, isPrivateIp };
