import { ClerkProvider } from '@clerk/nextjs';
import { Toaster } from 'sonner';
import './globals.css';

export const metadata = {
  title: 'Fluxora — Cockpit financier',
  description: 'La plateforme financière des freelances et PME',
};

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html lang="fr">
        <body className="antialiased bg-gray-50 text-gray-900">
          {children}
          <Toaster
            position="bottom-right"
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
