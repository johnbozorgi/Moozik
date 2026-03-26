import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from './firebase';
import JoinScreen from './components/JoinScreen';
import GuestView from './components/GuestView';
import Toast from './components/Toast';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [room, setRoom] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        // Sync user to PostgreSQL
        try {
          const token = await u.getIdToken();
          await fetch(`${API_BASE}/api/users/sync`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
          });
        } catch (e) {
          console.error('User sync failed:', e);
        }
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Auto-join from URL param ?room=XXXXX
  useEffect(() => {
    if (!user) return;
    const params = new URLSearchParams(window.location.search);
    const code = params.get('room');
    if (code) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [user]);

  const login = () => signInWithPopup(auth, googleProvider).catch((e) => showToast(e.message, 'error'));
  const logout = () => {
    signOut(auth);
    setRoom(null);
  };

  if (loading) {
    return (
      <div style={styles.center}>
        <div style={styles.spinner} />
      </div>
    );
  }

  return (
    <div style={styles.app}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.logo}>
          <span style={styles.logoIcon}>🎵</span>
          <span style={styles.logoText}>Moozik</span>
        </div>
        <div style={styles.headerRight}>
          {user ? (
            <>
              <img src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`}
                alt="" style={styles.avatar} referrerPolicy="no-referrer" />
              <button style={{ ...styles.btn, ...styles.btnGhost }} onClick={logout}>Sign Out</button>
            </>
          ) : (
            <button style={{ ...styles.btn, ...styles.btnPrimary }} onClick={login}>
              Sign In with Google
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main style={styles.main}>
        {room ? (
          <GuestView
            user={user}
            room={room}
            onExit={() => setRoom(null)}
            showToast={showToast}
            apiBase={API_BASE}
          />
        ) : (
          <JoinScreen
            user={user}
            onJoin={(roomData) => setRoom(roomData)}
            onLogin={login}
            showToast={showToast}
          />
        )}
      </main>

      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
}

const styles = {
  app: { minHeight: '100vh', background: '#000', color: '#fff', display: 'flex', flexDirection: 'column' },
  header: { height: 60, borderBottom: '1px solid #27272a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', position: 'sticky', top: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', zIndex: 40 },
  logo: { display: 'flex', alignItems: 'center', gap: 8 },
  logoIcon: { fontSize: 24 },
  logoText: { fontSize: 20, fontWeight: 800 },
  headerRight: { display: 'flex', alignItems: 'center', gap: 12 },
  avatar: { width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' },
  main: { flex: 1, overflowY: 'auto', paddingBottom: 20 },
  center: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' },
  spinner: { width: 40, height: 40, border: '3px solid #27272a', borderTop: '3px solid #10b981', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  btn: { padding: '8px 16px', borderRadius: 12, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s' },
  btnPrimary: { background: '#10b981', color: '#fff' },
  btnGhost: { background: 'transparent', color: '#a1a1aa' },
};
