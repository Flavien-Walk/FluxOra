import { SITE_URL } from '@/lib/site';

// Pages publiques indexables
export default function sitemap() {
  const now = new Date();
  return [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    ...['mentions-legales', 'confidentialite', 'cookies', 'cgu', 'cgv'].map((p) => ({
      url: `${SITE_URL}/legal/${p}`, lastModified: now, changeFrequency: 'yearly', priority: 0.3,
    })),
  ];
}
