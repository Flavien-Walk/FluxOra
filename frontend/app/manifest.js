// Manifest PWA — permet « Ajouter à l'écran d'accueil » sur mobile
export default function manifest() {
  return {
    name: 'Fluxora — Cockpit financier',
    short_name: 'Fluxora',
    description: 'La plateforme financière des freelances et PME',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#F8FAFC',
    theme_color: '#FFFFFF',
    lang: 'fr',
    icons: [
      { src: '/icon/192', sizes: '192x192', type: 'image/png' },
      { src: '/icon/512', sizes: '512x512', type: 'image/png' },
      { src: '/icon/512', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
