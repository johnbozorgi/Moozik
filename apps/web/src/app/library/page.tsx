import '../surface.css';
import { customPlaylists, libraryFavorites, superHosts } from '../roombeat-data';

export const metadata = {
  title: 'Library | RoomBeat',
  description: 'Favorites, custom playlists, follows, and saved YouTube links.',
};

export default function LibraryPage() {
  return (
    <main className="surface-shell">
      <header className="surface-header">
        <div>
          <p className="eyebrow">Personal Library</p>
          <h1>Library</h1>
          <p>Favorites, custom playlists, follows, and saved RoomBeat memories.</p>
        </div>
        <button className="pill-button">Import YouTube playlist</button>
      </header>

      <section className="content-grid">
        <div className="section-stack">
          <section className="glass-card panel-pad">
            <h2>Liked tracks</h2>
            <div className="favorite-list">
              {libraryFavorites.map((track) => (
                <article key={track.title}>
                  <div>
                    <strong>❤️ {track.title}</strong>
                    <span>{track.artist}</span>
                  </div>
                  <span>{track.savedAt}</span>
                </article>
              ))}
            </div>
          </section>

          <section className="glass-card panel-pad">
            <h2>Custom playlists</h2>
            <div className="playlist-grid">
              {customPlaylists.map((playlist) => (
                <article className="playlist-card" key={playlist.name}>
                  <strong>{playlist.name}</strong>
                  <span>{playlist.tracks} tracks</span>
                  <span>{playlist.source}</span>
                </article>
              ))}
            </div>
          </section>
        </div>

        <aside className="glass-card panel-pad">
          <h2>Following</h2>
          <div className="follow-grid">
            {superHosts.map((host) => (
              <article className="follow-card" key={host.name}>
                <strong>{host.name}</strong>
                <span>{host.specialty}</span>
                <span>{host.followers} followers</span>
              </article>
            ))}
          </div>
        </aside>
      </section>
    </main>
  );
}
