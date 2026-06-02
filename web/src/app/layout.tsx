import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';

const manropeSans = localFont({
  variable: '--font-manrope-sans',
  display: 'swap',
  src: [
    {
      path: '../../node_modules/@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2',
      style: 'normal',
      weight: '100 900',
    },
  ],
});

const robotoMono = localFont({
  variable: '--font-roboto-mono',
  display: 'swap',
  src: [
    {
      path: '../../node_modules/@fontsource-variable/roboto-mono/files/roboto-mono-latin-wght-normal.woff2',
      style: 'normal',
      weight: '100 700',
    },
  ],
});

export const metadata: Metadata = {
  title: 'AfricaPhone | Accueil',
  description: 'Retrouvez le meilleur des smartphones, tablettes et accessoires sélectionnés par AfricaPhone.',
  icons: {
    icon: '/icon.png',
    shortcut: '/icon.png',
    apple: '/icon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={`${manropeSans.variable} ${robotoMono.variable} antialiased bg-slate-50 text-slate-900`}>
        {children}
      </body>
    </html>
  );
}
