import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/hooks/useAuth';

export const metadata: Metadata = {
  title: 'GachaVerse — Idle Gacha RPG',
  description: 'Invoque, équipe, conquiers. Un idle gacha RPG multivers.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#030208',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Layout racine de l'App Router : la police s'applique bien à toutes les pages
            (l'avertissement vise l'ancien pages/_document.js). */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;900&family=Rajdhani:wght@400;500;600;700&family=Orbitron:wght@400;700;900&family=Press+Start+2P&family=Nanum+Brush+Script&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-gray-950 text-white antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
