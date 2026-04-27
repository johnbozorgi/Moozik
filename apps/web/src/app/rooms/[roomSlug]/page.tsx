import type { Metadata } from 'next';
import type { CSSProperties } from 'react';
import { getRoomBySlug, lyricLines, queueTracks } from '../../roombeat-data';
import './room.css';

type RoomPageProps = {
  params: Promise<{ roomSlug: string }>;
};

export async function generateMetadata({ params }: RoomPageProps): Promise<Metadata> {
  const { roomSlug } = await params;
  const room = getRoomBySlug(roomSlug);

  return {
    title: `${room.title} | RoomBeat`,
    description: `Join ${room.host}'s live room. Now playing: ${room.currentTrack}.`,
    openGraph: {
      title: `${room.title} | RoomBeat`,
      description: `${room.listeners.toLocaleString()} listeners live. Beat Rate ${room.beatRate}.`,
      images: [{ url: room.thumbnailUrl, width: 480, height: 360 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${room.title} | RoomBeat`,
      description: `Now playing: ${room.currentTrack}.`,
      images: [room.thumbnailUrl],
    },
  };
}

export default async function RoomPage({ params }: RoomPageProps) {
  const { roomSlug } = await params;
  const room = getRoomBySlug(roomSlug);
  const accentStyle = { '--accent-rgb': room.accent.rgb } as CSSProperties;

  return (
    <main className="room-shell" style={accentStyle}>
      <section className="room-grid">
        <header className="room-header room-glass">
          <div>
            <p>
              Hosted by <strong>{room.host}</strong>
            </p>
            <h1>{room.title}</h1>
          </div>
          <div className="room-status">
            <span>{room.listeners.toLocaleString()} live</span>
            <span>Beat Rate {room.beatRate}</span>
            <span>{room.accent.name}</span>
          </div>
        </header>

        <aside className="lyrics-pane room-glass">
          <h2>Synchronized lyrics</h2>
          {lyricLines.map((line) => (
            <button key={line.time}>
              <span>{line.time}</span>
              <strong>{line.text}</strong>
              <small className="jump-button">Suggest jump</small>
            </button>
          ))}
        </aside>

        <section className="video-stage room-glass">
          <div className="video-frame">
            <img src={room.thumbnailUrl} alt="" />
            <div className="video-overlay">
              <div>
                <p>Now playing</p>
                <h2>{room.currentTrack}</h2>
              </div>
              <div className="visualizer" aria-label="Live room visualizer">
                <i />
                <i />
                <i />
                <i />
                <i />
              </div>
            </div>
          </div>

          <div className="reaction-dock" aria-label="Live sound reactions">
            <button aria-label="Fire reaction">🔥</button>
            <button aria-label="Clap reaction">👏</button>
            <button aria-label="Heart reaction">❤️</button>
            <button aria-label="Bass reaction">🔊</button>
            <span className="float-reaction">🔥</span>
            <span className="float-reaction two">❤️</span>
          </div>
        </section>

        <aside className="social-queue room-glass">
          <h2>Social queue</h2>
          <div className="queue-list">
            {queueTracks.map((track) => (
              <article className="queue-track" key={track.title}>
                <span className="avatar">{track.avatar}</span>
                <div>
                  <strong>{track.title}</strong>
                  <small>
                    {track.requester} · {track.duration}
                  </small>
                </div>
                <span className="vote-stack">
                  <b>+{track.votes}</b>
                  <em>-{track.downvotes}</em>
                </span>
              </article>
            ))}
          </div>
        </aside>

        <section className="host-admin room-glass">
          <h2>Host control center</h2>
          <div className="admin-field">
            <strong>Queue rights</strong>
            <span>Only friends can add songs</span>
            <button>Change access</button>
          </div>
          <div className="admin-field">
            <strong>DJ style</strong>
            <span>Automatic cross-fade with manual override</span>
            <button>Tune transitions</button>
          </div>
          <div className="admin-field">
            <strong>Co-hosts</strong>
            <span>2 moderators active</span>
            <button>Manage team</button>
          </div>
        </section>

        <section className="profile-card room-glass">
          <h2>Music Taste DNA</h2>
          <svg className="taste-web" viewBox="0 0 220 180" role="img" aria-label="Music taste graph">
            <polygon
              points="110,18 184,56 168,136 110,162 46,138 34,58"
              fill="rgba(255,255,255,0.04)"
              stroke="rgba(255,255,255,0.16)"
            />
            <polygon
              points="110,34 164,64 150,122 110,144 68,126 54,70"
              fill={`rgba(${room.accent.rgb},0.28)`}
              stroke={room.accent.primary}
              strokeWidth="3"
            />
          </svg>
          <div className="badge-row">
            <span>DJ Level 12</span>
            <span>Queue King</span>
            <span>Night Owl</span>
          </div>
        </section>
      </section>
    </main>
  );
}
