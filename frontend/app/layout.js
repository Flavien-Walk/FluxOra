import { ClerkProvider } from '@clerk/nextjs';
import { Toaster } from 'sonner';
import './globals.css';
import { SITE_URL } from '@/lib/site';
import MotionProvider from '@/components/layout/MotionProvider';

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'Fluxora — Cockpit financier',
  description: 'La plateforme financière des freelances et PME',
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    siteName: 'Fluxora',
    title: 'Fluxora — Cockpit financier pour freelances & PME',
    description: 'Factures, devis, dépenses, TVA et trésorerie dans un seul outil, avec un assistant IA.',
  },
  twitter: { card: 'summary_large_image' },
  // Ajout à l'écran d'accueil iOS : s'ouvre en plein écran comme une app
  appleWebApp: {
    capable: true,
    title: 'Fluxora',
    statusBarStyle: 'default',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover', // accès aux safe-areas (encoche, barre home iPhone)
  themeColor: '#FFFFFF',
};

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html lang="fr">
        <body className="antialiased bg-gray-50 text-gray-900">
          <MotionProvider>{children}</MotionProvider>
          <Toaster
            position="bottom-right"
            mobileOffset={{ bottom: 'calc(5rem + env(safe-area-inset-bottom))' }}
            toastOptions={{
              classNames: {
                toast: 'font-sans text-sm shadow-md rounded-xl border border-gray-100',
                success: 'text-green-700',
                error: 'text-red-600',
              },
            }}
          />
        </body>
      </html>
    </ClerkProvider>
  );
}
