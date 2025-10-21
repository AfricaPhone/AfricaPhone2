import type { Metadata } from 'next';
import { Inter, Roboto_Mono } from 'next/font/google';
import './globals.css';
import TopProgressBar from '@/components/TopProgressBar';

const interSans = Inter({
  variable: '--font-inter-sans',
  subsets: ['latin'],
});

const robotoMono = Roboto_Mono({
  variable: '--font-roboto-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'AfricaPhone | Accueil',
  description: 'Retrouvez le meilleur des smartphones, tablettes et accessoires sélectionnés par AfricaPhone.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={`${interSans.variable} ${robotoMono.variable} antialiased bg-slate-50 text-slate-900`}>
        <TopProgressBar />
        {children}
      </body>
    </html>
  );
}
