import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'sonner';

import { Providers } from './providers';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'LINKMED — Soluções Médicas',
    template: '%s · LINKMED — Soluções Médicas',
  },
  description:
    'Sistema de Gestão da Qualidade Regulatória (RDC 665/22) e Assistência Técnica Hospitalar — LINKMED Soluções Médicas.',
  applicationName: 'LINKMED — Soluções Médicas',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/logo-linkmed.jpg', type: 'image/jpeg' },
      { url: '/favicon.ico' },
    ],
    shortcut: ['/logo-linkmed.jpg'],
    apple: [{ url: '/logo-linkmed.jpg', type: 'image/jpeg' }],
  },
  appleWebApp: {
    capable: true,
    title: 'LINKMED',
    statusBarStyle: 'default',
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#307D54' },
    { media: '(prefers-color-scheme: dark)', color: '#0A1410' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (localStorage.getItem('linkmed-theme') === 'dark' || (!('linkmed-theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body className={`${inter.variable} font-sans`}>
        <Providers>
          {children}
          <Toaster
            position="top-right"
            richColors
            closeButton
            expand
            toastOptions={{ className: 'text-sm shadow-lg' }}
          />
        </Providers>
      </body>
    </html>
  );
}