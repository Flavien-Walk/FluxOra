import Sidebar from '@/components/layout/Sidebar';
import MobileNav from '@/components/layout/MobileNav';
import AssistantTrigger from '@/components/assistant/AssistantTrigger';

export default function DashboardLayout({ children }) {
  return (
    <div className="flex min-h-screen" style={{ background: 'var(--app-bg)' }}>
      {/* Desktop : sidebar — Mobile : barre d'onglets en bas */}
      <Sidebar />
      <main className="flex-1 min-w-0 flex flex-col overflow-x-clip pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0">
        {children}
      </main>
      <MobileNav />
      {/* Assistant IA — bouton flottant + drawer, client component */}
      <AssistantTrigger />
    </div>
  );
}
