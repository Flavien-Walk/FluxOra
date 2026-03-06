import { ClerkProvider } from '@clerk/nextjs';
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
        </body>
      </html>
    </ClerkProvider>
  );
}
