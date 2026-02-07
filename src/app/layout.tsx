import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { PeerProvider } from '@/context/PeerContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'SyncOrSink',
  description: 'A Multiplayer P2P Game',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <PeerProvider>
          {children}
        </PeerProvider>
      </body>
    </html>
  );
}
