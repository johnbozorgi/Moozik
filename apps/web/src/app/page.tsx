import Link from 'next/link';
import type { CSSProperties } from 'react';
import './home.css';
import { featuredChannels, friendActivity, moods, trendingRooms } from './roombeat-data';

export default function HomePage() {
  const nowRoom = featuredChannels[1] ?? featuredChannels[0];

  if (!nowRoom) {
    return null;
  }

  return (
    <main className="home-shell">
      <div className="ambient ambient-a" />
      <div className="ambient ambient-b" />

      <section className="hero-band">
        <div className="hero-copy">
          <p className="eyebrow">Social Experience Engine</p>
          <h1>RoomBeat</h1>
          <p>
            Music rooms that breathe with the track: synchronized YouTube playback, social queues,
            live reactions, and room memories that last after the final chorus.
          </p>
          <div className="hero-actions">
            <Link href="/rooms/demo" className="primary-action">
              Join live demo
            </Link>
            <a href="#discovery" className="secondary-action">
              Browse vibes
            </a>
          </div>
        </div>

        <div
          className="now-card"
          style={{ '--accent-rgb': nowRoom.accent.rgb } as CSSProperties}
        >
          <div className="pulse-ring" />
          <img src={nowRoom.thumbnailUrl} alt="" />
          <div>
            <span>Now pulsing</span>
            <strong>{nowRoom.title}</strong>
            <p>{nowRoom.currentTrack}</p>
          </div>
        </div>
      </section>

      <section id="discovery" className="discovery-grid">
        <aside className="glass-panel friend-panel">
          <div className="panel-header">
            <p className="eyebrow">Friends</p>
            <span>live now</span>
          </div>
          {friendActivity.map((friend) => (
            <Link href="/rooms/demo" className="friend-row" key={friend.name}>
              <span className="avatar">{friend.avatar}</span>
              <span>
                <strong>{friend.name}</strong>
                <small>{friend.room}</small>
              </span>
              <em>{friend.pulse}</em>
            </Link>
          ))}
        </aside>

        <div className="main-rail">
          <div className="mood-strip" aria-label="Mood filters">
            {moods.map((mood) => (
              <button key={mood}>{mood}</button>
            ))}
          </div>

          <section className="content-block">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Always-On</p>
                <h2>Featured channels</h2>
              </div>
              <span>Platform managed rooms</span>
            </div>
            <div className="featured-grid">
              {featuredChannels.map((room) => (
                <Link
                  href={`/rooms/${room.slug}`}
                  className="featured-card"
                  key={room.slug}
                  style={{ '--accent-rgb': room.accent.rgb } as CSSProperties}
                >
                  <img src={room.thumbnailUrl} alt="" />
                  <div>
                    <strong>{room.title}</strong>
                    <span>{room.currentTrack}</span>
                  </div>
                  <small>{room.listeners.toLocaleString()} listening</small>
                </Link>
              ))}
            </div>
          </section>

          <section className="content-block">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Trending Now</p>
                <h2>Highest Beat Rate</h2>
              </div>
              <span>listeners plus reaction velocity</span>
            </div>
            <div className="trending-row">
              {trendingRooms.map((room) => (
                <Link
                  href={`/rooms/${room.slug}`}
                  className="room-tile"
                  key={room.slug}
                  style={{ '--accent-rgb': room.accent.rgb } as CSSProperties}
                >
                  <img src={room.thumbnailUrl} alt="" />
                  <span>{room.mood}</span>
                  <strong>{room.title}</strong>
                  <small>
                    Beat Rate {room.beatRate} · {room.listeners} live
                  </small>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
