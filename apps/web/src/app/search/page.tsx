import Link from 'next/link';
import '../surface.css';
import { artists, chartGroups, moods, searchSuggestions, trendingRooms } from '../roombeat-data';

export const metadata = {
  title: 'Search | RoomBeat',
  description: 'Search YouTube tracks, artists, playlists, and live RoomBeat rooms.',
};

export default function SearchPage() {
  return (
    <main className="surface-shell">
      <header className="surface-header">
        <div>
          <p className="eyebrow">YouTube Discovery</p>
          <h1>Search</h1>
          <p>
            Find tracks, albums, imported playlists, artists, and active rooms within three taps.
          </p>
        </div>
      </header>

      <section className="search-box glass-card">
        <input placeholder="Search YouTube tracks, playlists, or artists" />
        <button>Search</button>
      </section>

      <div className="filter-row" aria-label="Search filters">
        <button>Tracks</button>
        <button>Albums</button>
        <button>Playlists</button>
      </div>

      <section className="content-grid">
        <div className="section-stack">
          <section className="glass-card panel-pad">
            <h2>Auto-complete</h2>
            <div className="suggestion-list">
              {searchSuggestions.map((suggestion) => (
                <Link href={`/search?q=${encodeURIComponent(suggestion)}`} key={suggestion}>
                  <strong>{suggestion}</strong>
                  <span>Search YouTube</span>
                </Link>
              ))}
            </div>
          </section>

          <section className="glass-card panel-pad">
            <h2>Mood presets</h2>
            <div className="filter-row">
              {moods.map((mood) => (
                <button key={mood}>{mood}</button>
              ))}
            </div>
          </section>

          <section className="glass-card panel-pad">
            <h2>Artists</h2>
            <div className="entity-grid">
              {artists.map((artist) => (
                <Link href={`/artists/${artist.slug}`} className="entity-card" key={artist.slug}>
                  <img src={artist.imageUrl} alt="" />
                  <strong>{artist.name}</strong>
                  <span>{artist.monthlyRooms} rooms this month</span>
                </Link>
              ))}
            </div>
          </section>
        </div>

        <aside className="glass-card panel-pad">
          <h2>Charts</h2>
          <div className="chart-list">
            {chartGroups.map((group) => (
              <Link href={`/rooms/${group.rooms[0]?.slug ?? 'demo'}`} key={group.label}>
                <strong>{group.label}</strong>
                <span>{group.rooms[0]?.title ?? 'RoomBeat'}</span>
              </Link>
            ))}
          </div>
        </aside>
      </section>

      <section className="glass-card panel-pad" style={{ marginTop: 18 }}>
        <h2>Skeleton loading pattern</h2>
        <div className="entity-grid">
          {trendingRooms.slice(0, 3).map((room) => (
            <div className="entity-card skeleton" style={{ minHeight: 180 }} key={room.slug} />
          ))}
        </div>
      </section>
    </main>
  );
}
