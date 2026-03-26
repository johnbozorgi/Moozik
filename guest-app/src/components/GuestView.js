import React, { useState, useEffect } from 'react';
import { ref, onValue, push, update, get, serverTimestamp } from 'firebase/database';
import { db } from '../firebase';

export default function GuestView({ user, room, onExit, showToast, apiBase }) {
  const [queue, setQueue] = useState([]);
  const [members, setMembers] = useState({});
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [pendingRequest, setPendingRequest] = useState(null);
  const [approved, setApproved] = useState(!room.requiresApproval || room.hostId === user?.uid);

  // Join room / request approval
  useEffect(() => {
    if (!user) return;
    const isBanned = room.bannedUids && room.bannedUids[user.uid];
    if (isBanned) { showToast('You are banned from this room', 'error'); onExit(); return; }

    if (room.requiresApproval && room.hostId !== user.uid) {
      const reqRef = ref(db, `rooms/${room.id}/requests/${user.uid}`);
      get(reqRef).then((snap) => {
        if (!snap.exists()) {
          // Send join request
          update(reqRef, {
            displayName: user.displayName || 'Anonymous',
            photoURL: user.photoURL || '',
            status: 'pending',
            createdAt: Date.now(),
          });
          showToast('Join request sent. Waiting for host approval...', 'info');
          setPendingRequest('pending');
        } else {
          const status = snap.val().status;
          if (status === 'approved') setApproved(true);
          else if (status === 'pending') {
            setPendingRequest('pending');
            showToast('Your request is still pending', 'info');
          } else {
            showToast('Your request was rejected', 'error');
            onExit();
          }
        }
      });

      // Listen for approval
      const unsub = onValue(reqRef, (snap) => {
        if (snap.exists() && snap.val().status === 'approved') {
          setApproved(true);
          setPendingRequest(null);
          showToast('You have been approved! Welcome 🎵', 'success');
        } else if (snap.exists() && snap.val().status === 'rejected') {
          showToast('Your request was rejected', 'error');
          onExit();
        }
      });
      return () => unsub();
    }
  }, [user, room]);

  // Register as member once approved
  useEffect(() => {
    if (!user || !approved) return;
    const memberRef = ref(db, `rooms/${room.id}/members/${user.uid}`);
    update(memberRef, {
      displayName: user.displayName || 'Anonymous',
      photoURL: user.photoURL || '',
      isMuted: false,
      joinedAt: Date.now(),
    });

    return () => {
      // Remove member on leave (best effort)
      update(memberRef, { leftAt: Date.now() });
    };
  }, [user, approved]);

  // Listen to queue
  useEffect(() => {
    const qRef = ref(db, `rooms/${room.id}/queue`);
    const unsub = onValue(qRef, (snap) => {
      const data = snap.val() || {};
      const tracks = Object.entries(data)
        .map(([id, t]) => ({ id, ...t }))
        .sort((a, b) => a.sortOrder - b.sortOrder);
      setQueue(tracks);
    });
    return () => unsub();
  }, [room.id]);

  // Listen to members (to check muted status)
  useEffect(() => {
    const mRef = ref(db, `rooms/${room.id}/members`);
    const unsub = onValue(mRef, (snap) => setMembers(snap.val() || {}));
    return () => unsub();
  }, [room.id]);

  // Listen to room status
  useEffect(() => {
    const rRef = ref(db, `rooms/${room.id}/status`);
    const unsub = onValue(rRef, (snap) => {
      if (snap.val() === 'ended') {
        showToast('The host ended the room', 'info');
        onExit();
      }
    });
    return () => unsub();
  }, [room.id]);

  const handleSearch = async () => {
    if (!search.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`${apiBase}/api/search?q=${encodeURIComponent(search)}`);
      const data = await res.json();
      setResults(data);
    } catch {
      showToast('Search failed', 'error');
    } finally {
      setSearching(false);
    }
  };

  const addToQueue = async (video, isWildcard = false) => {
    if (!user) return showToast('Sign in to add songs', 'error');
    const myMember = members[user.uid];
    if (myMember?.isMuted) return showToast('You are muted in this room', 'error');

    const sortOrder = isWildcard ? -Date.now() : Date.now();
    const qRef = ref(db, `rooms/${room.id}/queue`);
    await push(qRef, {
      youtubeId: video.id,
      title: video.title,
      thumbnail: video.thumbnail,
      addedBy: user.displayName || 'Anonymous',
      addedByUid: user.uid,
      isWildcard,
      sortOrder,
      status: 'queued',
      createdAt: Date.now(),
    });

    // Log play to backend
    try {
      const token = await user.getIdToken();
      await fetch(`${apiBase}/api/play-history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ youtubeId: video.id, title: video.title, thumbnail: video.thumbnail, roomCode: room.roomCode }),
      });
    } catch (e) { /* non-critical */ }

    showToast('Added to queue!', 'success');
    setSearch('');
    setResults([]);
  };

  const currentTrack = queue.find((t) => t.status === 'playing');
  const upcomingQueue = queue.filter((t) => t.status === 'queued');

  if (pendingRequest === 'pending') {
    return (
      <div style={styles.center}>
        <div style={styles.pendingCard}>
          <div style={styles.pendingIcon}>⏳</div>
          <h2>Waiting for Approval</h2>
          <p style={{ color: '#71717a', marginTop: 8 }}>The host will let you in shortly.</p>
          <button style={{ ...styles.btn, ...styles.btnGhost, marginTop: 24 }} onClick={onExit}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Room Header */}
      <div style={styles.roomHeader}>
        <div>
          <h2 style={{ fontWeight: 800, fontSize: 18 }}>{room.name}</h2>
          <p style={{ color: '#71717a', fontSize: 12, marginTop: 2 }}>
            Room: <span style={{ fontFamily: 'monospace', color: '#10b981' }}>{room.roomCode}</span>
            {room.vibe && <span> · "{room.vibe}"</span>}
          </p>
        </div>
        <button style={{ ...styles.btn, ...styles.btnGhost }} onClick={onExit}>Leave</button>
      </div>

      {/* Now Playing */}
      {currentTrack && (
        <div style={styles.nowPlaying}>
          <img src={currentTrack.thumbnail} alt="" style={styles.npThumb} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={styles.npLabel}>Now Playing</p>
            <p style={styles.npTitle}>{currentTrack.title}</p>
            <p style={styles.npSub}>Added by {currentTrack.addedBy}</p>
          </div>
          <div style={styles.npPulse} />
        </div>
      )}

      {/* Search */}
      <div style={styles.searchRow}>
        <input
          style={styles.input}
          placeholder="Search YouTube..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button style={{ ...styles.btn, ...styles.btnPrimary }} onClick={handleSearch} disabled={searching}>
          {searching ? '...' : '🔍'}
        </button>
      </div>

      {/* Search Results */}
      {results.length > 0 && (
        <div style={styles.results}>
          {results.map((video) => (
            <div key={video.id} style={styles.resultItem}>
              <img src={video.thumbnail} alt="" style={styles.resultThumb} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={styles.resultTitle}>{video.title}</p>
                <p style={styles.resultChannel}>{video.channelTitle}</p>
              </div>
              <button
                style={{ ...styles.btn, ...styles.btnPrimary, padding: '8px 14px' }}
                onClick={() => addToQueue(video)}
              >
                +
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Queue */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Queue ({upcomingQueue.length})</h3>
        {upcomingQueue.length === 0 ? (
          <p style={{ color: '#52525b', textAlign: 'center', padding: '24px 0', fontSize: 14 }}>
            Queue is empty. Add some fire! 🔥
          </p>
        ) : (
          upcomingQueue.map((track) => (
            <div key={track.id} style={styles.queueItem}>
              <img src={track.thumbnail} alt="" style={styles.queueThumb} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={styles.queueTitle}>{track.title}</p>
                <p style={styles.queueSub}>by {track.addedBy}</p>
              </div>
              {track.isWildcard && <span style={styles.wildcard}>⚡ Wildcard</span>}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const styles = {
  container: { maxWidth: 640, margin: '0 auto', padding: '16px', paddingBottom: 40 },
  roomHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, padding: '12px 16px', background: '#18181b', borderRadius: 16, border: '1px solid #27272a' },
  nowPlaying: { display: 'flex', alignItems: 'center', gap: 12, padding: 16, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 16, marginBottom: 16, position: 'relative', overflow: 'hidden' },
  npThumb: { width: 56, height: 56, borderRadius: 12, objectFit: 'cover', flexShrink: 0 },
  npLabel: { fontSize: 10, fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 },
  npTitle: { fontWeight: 700, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  npSub: { fontSize: 11, color: '#71717a', marginTop: 2 },
  npPulse: { position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', width: 10, height: 10, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 0 4px rgba(16,185,129,0.2)' },
  searchRow: { display: 'flex', gap: 8, marginBottom: 12 },
  input: { flex: 1, background: '#18181b', border: '1px solid #27272a', borderRadius: 12, padding: '12px 16px', color: '#fff', fontSize: 15, outline: 'none' },
  btn: { border: 'none', borderRadius: 12, padding: '10px 18px', fontSize: 14, fontWeight: 700, cursor: 'pointer' },
  btnPrimary: { background: '#10b981', color: '#fff' },
  btnGhost: { background: 'transparent', color: '#a1a1aa' },
  results: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 },
  resultItem: { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: '#18181b', border: '1px solid #27272a', borderRadius: 14 },
  resultThumb: { width: 64, height: 42, borderRadius: 8, objectFit: 'cover', flexShrink: 0 },
  resultTitle: { fontSize: 13, fontWeight: 600, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' },
  resultChannel: { fontSize: 11, color: '#71717a', marginTop: 2 },
  section: { marginTop: 20 },
  sectionTitle: { fontSize: 14, fontWeight: 700, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
  queueItem: { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'rgba(24,24,27,0.5)', border: '1px solid rgba(39,39,42,0.5)', borderRadius: 14, marginBottom: 6 },
  queueThumb: { width: 40, height: 40, borderRadius: 8, objectFit: 'cover', opacity: 0.7, flexShrink: 0 },
  queueTitle: { fontSize: 13, color: '#a1a1aa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  queueSub: { fontSize: 10, color: '#52525b', marginTop: 2 },
  wildcard: { fontSize: 10, color: '#f59e0b', fontWeight: 700, flexShrink: 0 },
  center: { minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  pendingCard: { background: '#18181b', border: '1px solid #27272a', borderRadius: 24, padding: 40, textAlign: 'center', maxWidth: 320 },
  pendingIcon: { fontSize: 48, marginBottom: 16 },
};
