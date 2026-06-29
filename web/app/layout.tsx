import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from './providers';
import { Nav } from '@/components/Nav';

export const metadata: Metadata = {
  title: 'RitualLend — credit-tiered RITUAL money market',
  description:
    'Single-asset overcollateralized RITUAL lending with on-chain credit scores, on Ritual Chain.',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f4f1ec' },
    { media: '(prefers-color-scheme: dark)',  color: '#0e0c0a' },
  ],
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

// Sync script — runs before paint to set the stored theme so there's no flash.
// Reads localStorage('rl-theme'); if set to 'dark' or 'light', applies it.
// Otherwise leaves data-theme unset so prefers-color-scheme takes over.
const themeBootScript = `
(function() {
  try {
    var v = localStorage.getItem('rl-theme');
    if (v === 'dark' || v === 'light') {
      document.documentElement.setAttribute('data-theme', v);
    }
  } catch (_) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Zen+Old+Mincho:wght@400;500&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>
          <Nav />
          {children}
        </Providers>
      </body>
    </html>
  );
}
