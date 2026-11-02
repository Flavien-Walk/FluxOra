import Sidebar from '@/components/layout/Sidebar';
import MobileNav from '@/components/layout/MobileNav';
import AssistantTrigger from '@/components/assistant/AssistantTrigger';

export default function DashboardLayout({ children }) {
  return (
    <div className="flex min-h-screen" style={{ background: 'var(--app-bg)' }}>
      {/* Lien d'évitement : visible au focus clavier (WCAG 2.4.1) */}
      <a href="#contenu" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-accent-700 focus:shadow-lg">
        Aller au contenu
      </a>
      {/* Desktop : sidebar — Mobile : barre d'onglets en bas */}
      <Sidebar />
      <main id="contenu" tabIndex={-1} className="flex-1 min-w-0 outline-none flex flex-col overflow-x-clip pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0">
        {children}
      </main>
      <MobileNav />
      {/* Assistant IA — bouton flottant + drawer, client component */}
      <AssistantTrigger />
    </div>
  );
}
