import { SITE_URL } from '@/lib/site';

export default function robots() {
  return {
    rules: [{ userAgent: '*', allow: ['/', '/legal/'], disallow: ['/dashboard', '/q/', '/pay/', '/onboarding', '/sign-in', '/sign-up'] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
