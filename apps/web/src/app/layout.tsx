import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'RoomBeat',
  description: 'Synchronized YouTube music rooms for live watching parties.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
