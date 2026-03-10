import Sidebar from '@/components/layout/Sidebar';
import AssistantTrigger from '@/components/assistant/AssistantTrigger';

export default function DashboardLayout({ children }) {
  return (
    <div className="flex min-h-screen" style={{ background: 'var(--app-bg)' }}>
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        {children}
      </main>
      {/* Assistant IA — bouton flottant + drawer, client component */}
      <AssistantTrigger />
    </div>
  );
}
