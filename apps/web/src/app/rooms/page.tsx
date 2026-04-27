import Link from 'next/link';
import '../surface.css';
import { featuredChannels, trendingRooms } from '../roombeat-data';

export const metadata = {
  title: 'Rooms | RoomBeat',
  description: 'Browse live RoomBeat music rooms and always-on channels.',
};

export default function RoomsPage() {
  const rooms = [...featuredChannels, ...trendingRooms];

  return (
    <main className="surface-shell">
      <header className="surface-header">
        <div>
          <p className="eyebrow">Live Rooms</p>
          <h1>Rooms</h1>
          <p>Join a room, start a session, or follow an always-on channel.</p>
        </div>
        <Link href="/rooms/demo" className="pill-button" style={{ display: 'grid', placeItems: 'center', minHeight: 48 }}>
          Create room
        </Link>
      </header>

      <section className="entity-grid">
        {rooms.map((room) => (
          <Link href={`/rooms/${room.slug}`} className="entity-card glass-card" key={room.slug}>
            <img src={room.thumbnailUrl} alt="" />
            <strong>{room.title}</strong>
            <span>
              {room.listeners.toLocaleString()} live · Beat Rate {room.beatRate}
            </span>
          </Link>
        ))}
      </section>
    </main>
  );
}
