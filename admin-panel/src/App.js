import React, { useEffect, useState } from 'react';
import { auth, googleProvider } from './firebase';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import AdminDashboard from './components/AdminDashboard';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export default function App() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        await checkAdminRole(firebaseUser);
      } else {
        setUser(null);
        setIsAdmin(false);
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  const checkAdminRole = async (firebaseUser) => {
    try {
      const token = await firebaseUser.getIdToken();
      const res = await fetch(`${API_URL}/api/admin/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setIsAdmin(true);
      } else if (res.status === 403) {
        setIsAdmin(false);
        setError('Access denied. You do not have admin privileges.');
      } else {
        setError('Failed to verify admin access.');
      }
    } catch {
      setError('Network error while verifying access.');
    }
    setLoading(false);
  };

  const handleSignIn = async () => {
    setError('');
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      setError('Sign-in failed: ' + e.message);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setIsAdmin(false);
    setError('');
  };

  if (loading) {
    return (
      <div style={styles.center}>
        <div style={styles.spinner} />
        <p style={{ color: '#a1a1aa', marginTop: 16 }}>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={styles.center}>
        <div style={styles.card}>
          <h1 style={styles.title}>Moozik Admin</h1>
          <p style={styles.subtitle}>Sign in with your admin Google account</p>
          {error && <p style={styles.error}>{error}</p>}
          <button style={styles.googleBtn} onClick={handleSignIn}>
            <svg width="20" height="20" viewBox="0 0 48 48" style={{ marginRight: 8 }}>
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.29-8.16 2.29-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div style={styles.center}>
        <div style={styles.card}>
          <h1 style={styles.title}>Access Denied</h1>
          <p style={styles.subtitle}>{error || 'You do not have admin privileges.'}</p>
          <p style={{ color: '#a1a1aa', fontSize: 14, marginBottom: 16 }}>
            Signed in as: {user.email}
          </p>
          <button style={styles.signOutBtn} onClick={handleSignOut}>
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return <AdminDashboard user={user} onSignOut={handleSignOut} />;
}

const styles = {
  center: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#09090b',
    padding: 16,
  },
  card: {
    background: '#18181b',
    border: '1px solid #27272a',
    borderRadius: 16,
    padding: 40,
    width: '100%',
    maxWidth: 400,
    textAlign: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 700,
    marginBottom: 8,
  },
  subtitle: {
    color: '#a1a1aa',
    fontSize: 14,
    marginBottom: 24,
  },
  error: {
    color: '#f87171',
    fontSize: 13,
    background: '#3b1c1c',
    border: '1px solid #7f1d1d',
    borderRadius: 8,
    padding: '10px 14px',
    marginBottom: 16,
  },
  spinner: {
    width: 40,
    height: 40,
    border: '3px solid #27272a',
    borderTop: '3px solid #a855f7',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  googleBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    padding: '12px 20px',
    background: '#fff',
    color: '#111',
    border: 'none',
    borderRadius: 10,
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
  },
  signOutBtn: {
    padding: '10px 24px',
    background: '#27272a',
    color: '#fff',
    border: '1px solid #3f3f46',
    borderRadius: 10,
    fontSize: 14,
    cursor: 'pointer',
  },
};
