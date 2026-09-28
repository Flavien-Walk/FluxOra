/** @type {import('next').NextConfig} */

// En-têtes de sécurité appliqués à toutes les pages.
// CSP appliquée : directives sans risque pour Clerk / Stripe (anti-clickjacking, pas de plugins, base-uri).
// CSP complète en mode « Report-Only » : observée dans la console, à passer en appliqué après vérification.
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const reportOnlyCsp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://*.clerk.accounts.dev https://challenges.cloudflare.com https://js.stripe.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' ${API} https://*.clerk.accounts.dev https://clerk-telemetry.com https://api.stripe.com`,
  "frame-src https://challenges.cloudflare.com https://js.stripe.com",
  "worker-src 'self' blob:",
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'" },
  { key: 'Content-Security-Policy-Report-Only', value: reportOnlyCsp },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
];

const nextConfig = {
  poweredByHeader: false,
  // Permet les images depuis des domaines externes (avatars Clerk, etc.)
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'img.clerk.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
