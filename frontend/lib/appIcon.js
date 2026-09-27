// Visuel commun des icônes PWA / iOS (rendu via next/og ImageResponse)
export function AppIcon({ size }) {
  // Éclair Fluxora sur fond cobalt, avec marge pour les icônes « maskable »
  return (
    <div
      style={{
        width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #3D87F5 0%, #1047B5 100%)',
      }}
    >
      <svg width={size * 0.46} height={size * 0.46} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    </div>
  );
}
