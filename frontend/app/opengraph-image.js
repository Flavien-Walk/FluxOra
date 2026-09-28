import { ImageResponse } from 'next/og';

// Image de partage (LinkedIn, Slack, X…) générée au build
export const alt = 'Fluxora — cockpit financier pour freelances et PME';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 72, background: 'linear-gradient(135deg, #0B1B3F 0%, #1047B5 100%)', color: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 72, height: 72, borderRadius: 18, background: '#1C6EF2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" /></svg>
          </div>
          <div style={{ fontSize: 44, fontWeight: 700 }}>Fluxora</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ fontSize: 68, fontWeight: 800, lineHeight: 1.05 }}>Factures, trésorerie, TVA : pilotez votre cash.</div>
          <div style={{ fontSize: 30, color: '#BFD3FF' }}>Le cockpit financier des freelances et PME, avec un assistant IA.</div>
        </div>
      </div>
    ),
    size
  );
}
