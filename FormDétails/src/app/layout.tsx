import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FormDetails – Suivi des votes',
  description: 'Prototype statique pour visualiser les votes attribués aux candidats.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
