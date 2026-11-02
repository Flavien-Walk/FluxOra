import { ImageResponse } from 'next/og';
import { AppIcon } from '@/lib/appIcon';

// Icônes de l'app (manifest PWA) générées au build : /icon/192 et /icon/512
export function generateImageMetadata() {
  return [
    { id: '192', size: { width: 192, height: 192 }, contentType: 'image/png' },
    { id: '512', size: { width: 512, height: 512 }, contentType: 'image/png' },
  ];
}

export default async function Icon({ id }) {
  const size = Number(await id);
  return new ImageResponse(<AppIcon size={size} />, { width: size, height: size });
}
