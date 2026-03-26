import React, { useState } from 'react';
import { ref, get, child } from 'firebase/database';
import { db } from '../firebase';

export default function JoinScreen({ user, onJoin, onLogin, showToast }) {
  const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false);

  const handleJoin = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return showToast('Enter a room code', 'error');
    if (!user) return onLogin();

    setJoining(true);
    try {
      // Look up roomId by code
      const codeSnap = await get(ref(db, `roomCodes/${trimmed}`));
      const roomId = codeSnap.val();
      if (!roomId) {
        showToast('Room not found or ended', 'error');
        setJoining(false);
        return;
      }

      const roomSnap = await get(ref(db, `rooms/${roomId}`));
      const roomData = roomSnap.val();

      if (!roomData || roomData.status !== 'active') {
        showToast('Room not found or ended', 'error');
        setJoining(false);
        return;
      }

      if (roomData.bannedUids && roomData.bannedUids[user.uid]) {
        showToast('You are banned from this room', 'error');
        setJoining(false);
        return;
      }

      onJoin({ id: roomId, ...roomData });
    } catch (e) {
      showToast('Error joining room', 'error');
      console.error(e);
    } finally {
      setJoining(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* Hero */}
      <section style={styles.hero}>
        <h1 style={styles.heroTitle}>
          Music is better{' '}
          <span style={{ color: '#10b981' }}>together.</span>
        </h1>
        <p style={styles.heroSub}>
          Enter a room code to join the vibe and add songs to the shared queue.
        </p>

        <div style={styles.joinBox}>
          <input
            style={styles.input}
            placeholder="Enter Room Code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            maxLength={8}
          />
          <button
            style={{ ...styles.btn, opacity: joining ? 0.6 : 1 }}
            onClick={handleJoin}
            disabled={joining}
          >
            {joining ? '...' : 'Join'}
          </button>
        </div>

        {!user && (
          <p style={styles.hint}>
            <button style={styles.linkBtn} onClick={onLogin}>Sign in with Google</button>
            {' '}to save your playlists and history
          </p>
        )}
      </section>
    </div>
  );
}

const styles = {
  container: { maxWidth: 640, margin: '0 auto', padding: '40px 20px' },
  hero: { textAlign: 'center', paddingTop: 60 },
  heroTitle: { fontSize: 'clamp(32px, 8vw, 56px)', fontWeight: 900, lineHeight: 1.1, marginBottom: 16 },
  heroSub: { color: '#a1a1aa', fontSize: 16, maxWidth: 480, margin: '0 auto 32px' },
  joinBox: { display: 'flex', gap: 8, maxWidth: 360, margin: '0 auto', background: '#18181b', border: '1px solid #27272a', borderRadius: 16, padding: 6 },
  input: { flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: 18, fontFamily: 'monospace', letterSpacing: 4, textTransform: 'uppercase', padding: '10px 12px' },
  btn: { background: '#10b981', color: '#fff', border: 'none', borderRadius: 12, padding: '10px 24px', fontSize: 15, fontWeight: 700, cursor: 'pointer' },
  hint: { marginTop: 16, color: '#71717a', fontSize: 14 },
  linkBtn: { background: 'none', border: 'none', color: '#10b981', cursor: 'pointer', fontSize: 14, fontWeight: 600, padding: 0 },
};
