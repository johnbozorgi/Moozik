import Link from 'next/link';
import './home.css';

export default function HomePage() {
  return (
    <main className="home-shell">
      <section className="home-panel">
        <p className="eyebrow">Live YouTube rooms</p>
        <h1>RoomBeat</h1>
        <p>
          Host synchronized music and video watching parties with real-time chat, reactions, and
          collaborative queues.
        </p>
        <Link href="/rooms/demo">Open demo room</Link>
      </section>
    </main>
  );
}
