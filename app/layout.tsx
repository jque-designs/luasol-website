import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, Martian_Mono, Montserrat } from 'next/font/google';
import { MarkDefs } from '@/components/Mark';
import Providers from '@/components/Providers';
import './globals.css';

const display = Bricolage_Grotesque({
  subsets: ['latin'],
  axes: ['opsz', 'wdth'],
  variable: '--font-display',
  display: 'swap',
});
const mono = Martian_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' });
const wordmark = Montserrat({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-wm', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL('https://luasol.io'),
  title: 'Lua Sol Labs — Tools, apps & infrastructure for Solana',
  description:
    'Lua Sol Labs builds open tools and apps for Solana and runs a mainnet validator. Stake natively in one click. A share of every epoch goes to children’s charities.',
  openGraph: {
    title: 'Lua Sol Labs — Night and day, we build for Solana.',
    description: 'Open tools, apps and mainnet infrastructure for Solana. Stake natively with Lua Sol Labs.',
    url: 'https://luasol.io',
    siteName: 'Lua Sol Labs',
    type: 'website',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Lua Sol Labs' }],
  },
  twitter: { card: 'summary_large_image', site: '@LuaSol_Labs', images: ['/og.png'] },
};

export const viewport: Viewport = { themeColor: '#2A2873', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${mono.variable} ${wordmark.variable}`}>
      <body>
        <MarkDefs />
        <a href="#main" className="skip">
          Skip to content
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
