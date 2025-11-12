import type { Metadata } from 'next';
import { Inter, Roboto_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
  weight: ['400', '600', '700'],
});

const robotoMono = Roboto_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
  weight: ['400', '500'],
});

export const metadata: Metadata = {
  title: 'AfricaPhone | Concours Presse Stars',
  description:
    'Formulaire officiel de candidature AfricaPhone. Les dossiers sont transmis de façon sécurisée vers Firestore et Firebase Storage.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className={`${inter.variable} ${robotoMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
