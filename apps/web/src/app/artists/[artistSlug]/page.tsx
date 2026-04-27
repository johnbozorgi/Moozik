import type { Metadata } from 'next';
import type { CSSProperties } from 'react';
import Link from 'next/link';
import '../../surface.css';
import { getArtistBySlug } from '../../roombeat-data';

type ArtistPageProps = {
  params: Promise<{ artistSlug: string }>;
};

export async function generateMetadata({ params }: ArtistPageProps): Promise<Metadata> {
  const { artistSlug } = await params;
  const artist = getArtistBySlug(artistSlug);

  return {
    title: `${artist.name} | RoomBeat`,
    description: `Top tracks and active rooms currently playing ${artist.name}.`,
    openGraph: {
      title: `${artist.name} on RoomBeat`,
      images: [{ url: artist.imageUrl }],
    },
  };
}

export default async function ArtistPage({ params }: ArtistPageProps) {
  const { artistSlug } = await params;
  const artist = getArtistBySlug(artistSlug);

  return (
    <main className="surface-shell" style={{ '--accent-rgb': artist.accent.rgb } as CSSProperties}>
      <section className="artist-hero glass-card">
        <img src={artist.imageUrl} alt="" />
        <div>
          <p className="eyebrow">Artist</p>
          <h1>{artist.name}</h1>
          <p>{artist.monthlyRooms} RoomBeat sessions this month</p>
        </div>
      </section>

      <section className="content-grid" style={{ marginTop: 18 }}>
        <div className="glass-card panel-pad">
          <h2>Top tracks</h2>
          <div className="favorite-list">
            {artist.topTracks.map((track) => (
              <article key={track}>
                <strong>{track}</strong>
                <span>♡ Save</span>
              </article>
            ))}
          </div>
        </div>

        <aside className="glass-card panel-pad">
          <h2>Active rooms</h2>
          <div className="chart-list">
            {artist.activeRooms.map((room) => (
              <Link href={`/rooms/${room.slug}`} key={room.slug}>
                <strong>{room.title}</strong>
                <span>{room.listeners} live</span>
              </Link>
            ))}
          </div>
        </aside>
      </section>
    </main>
  );
}
