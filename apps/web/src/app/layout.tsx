import type { Metadata } from 'next';
import Link from 'next/link';
import { trendingRooms } from './roombeat-data';
import './globals.css';

export const metadata: Metadata = {
  title: 'RoomBeat',
  description: 'Synchronized YouTube music rooms for live watching parties.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const miniRoom = trendingRooms[0];

  return (
    <html lang="en">
      <body>
        <div className="app-chrome">{children}</div>
        {miniRoom && (
          <aside className="mini-player" aria-label="Mini player">
            <img src={miniRoom.thumbnailUrl} alt="" />
            <div>
              <strong>{miniRoom.currentTrack}</strong>
              <span>{miniRoom.title}</span>
            </div>
            <button aria-label="Play or pause">▶</button>
          </aside>
        )}
        <nav className="bottom-tabs" aria-label="Primary navigation">
          <Link href="/">Home</Link>
          <Link href="/search">Search</Link>
          <Link href="/rooms/demo">Rooms</Link>
          <Link href="/library">Library</Link>
        </nav>
      </body>
    </html>
  );
}
