import { ClerkProvider } from '@clerk/nextjs';
import { Toaster } from 'sonner';
import './globals.css';

export const metadata = {
  title: 'Fluxora — Cockpit financier',
  description: 'La plateforme financière des freelances et PME',
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
          {children}
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
