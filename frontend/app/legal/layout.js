import Link from 'next/link';

export default function LegalLayout({ children }) {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Nav */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold text-slate-900">
            Flux<span className="text-indigo-600">ora</span>
          </Link>
          <nav className="flex items-center gap-6 text-sm text-slate-500">
            <Link href="/legal/mentions-legales" className="hover:text-slate-900 transition-colors">Mentions légales</Link>
            <Link href="/legal/cgu" className="hover:text-slate-900 transition-colors">CGU</Link>
            <Link href="/legal/cgv" className="hover:text-slate-900 transition-colors">CGV</Link>
            <Link href="/legal/confidentialite" className="hover:text-slate-900 transition-colors">Confidentialité</Link>
            <Link href="/legal/cookies" className="hover:text-slate-900 transition-colors">Cookies</Link>
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-16">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white mt-16">
        <div className="max-w-4xl mx-auto px-6 py-8 text-center text-sm text-slate-400">
          © {new Date().getFullYear()} Fluxora. Tous droits réservés.{' '}
          <Link href="/" className="text-indigo-600 hover:underline">Retour à l&apos;accueil</Link>
        </div>
      </footer>
    </div>
  );
}
