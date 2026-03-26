import React, { useEffect, useState, useCallback } from 'react';
import { auth } from '../firebase';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const TABS = ['Overview', 'Users', 'Rooms', 'Ads'];

export default function AdminDashboard({ user, onSignOut }) {
  const [tab, setTab] = useState('Overview');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [ads, setAds] = useState({ headerCode: '', footerCode: '' });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const getToken = useCallback(async () => {
    return auth.currentUser?.getIdToken();
  }, []);

  const apiFetch = useCallback(async (path, options = {}) => {
    const token = await getToken();
    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }, [getToken]);

  // Load data based on active tab
  useEffect(() => {
    setLoading(true);
    if (tab === 'Overview') {
      apiFetch('/api/admin/stats')
        .then(setStats)
        .catch(() => showToast('Failed to load stats'))
        .finally(() => setLoading(false));
    } else if (tab === 'Users') {
      apiFetch('/api/admin/users')
        .then((data) => setUsers(data.users || []))
        .catch(() => showToast('Failed to load users'))
        .finally(() => setLoading(false));
    } else if (tab === 'Rooms') {
      apiFetch('/api/admin/rooms')
        .then((data) => setRooms(data.rooms || []))
        .catch(() => showToast('Failed to load rooms'))
        .finally(() => setLoading(false));
    } else if (tab === 'Ads') {
      apiFetch('/api/admin/ads')
        .then((data) => setAds(data || { headerCode: '', footerCode: '' }))
        .catch(() => showToast('Failed to load ads'))
        .finally(() => setLoading(false));
    }
  }, [tab, apiFetch]);

  const toggleUserBan = async (uid, currentBanned) => {
    try {
      await apiFetch(`/api/admin/users/${uid}`, {
        method: 'PATCH',
        body: JSON.stringify({ banned: !currentBanned }),
      });
      setUsers((prev) =>
        prev.map((u) => (u.uid === uid ? { ...u, banned: !currentBanned } : u))
      );
      showToast(`User ${currentBanned ? 'unbanned' : 'banned'} successfully`);
    } catch {
      showToast('Failed to update user');
    }
  };

  const toggleRoomStatus = async (roomId, currentActive) => {
    try {
      await apiFetch(`/api/admin/rooms/${roomId}`, {
        method: 'PATCH',
        body: JSON.stringify({ active: !currentActive }),
      });
      setRooms((prev) =>
        prev.map((r) => (r.id === roomId ? { ...r, active: !currentActive } : r))
      );
      showToast(`Room ${currentActive ? 'deactivated' : 'activated'}`);
    } catch {
      showToast('Failed to update room');
    }
  };

  const saveAds = async () => {
    try {
      await apiFetch('/api/admin/ads', {
        method: 'POST',
        body: JSON.stringify(ads),
      });
      showToast('Ads saved successfully');
    } catch {
      showToast('Failed to save ads');
    }
  };

  return (
    <div style={styles.layout}>
      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <div style={styles.logo}>
          <span style={styles.logoText}>Moozik</span>
          <span style={styles.logoAdmin}>Admin</span>
        </div>
        <nav style={styles.nav}>
          {TABS.map((t) => (
            <button
              key={t}
              style={{ ...styles.navItem, ...(tab === t ? styles.navItemActive : {}) }}
              onClick={() => setTab(t)}
            >
              {tabIcon(t)}
              {t}
            </button>
          ))}
        </nav>
        <div style={styles.userSection}>
          <img
            src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`}
            alt="avatar"
            style={styles.avatar}
          />
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <p style={styles.userName}>{user.displayName || 'Admin'}</p>
            <p style={styles.userEmail}>{user.email}</p>
          </div>
          <button style={styles.signOutBtn} onClick={onSignOut} title="Sign out">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={styles.main}>
        <div style={styles.header}>
          <h1 style={styles.pageTitle}>{tab}</h1>
        </div>

        {loading ? (
          <div style={styles.loadingCenter}>
            <div style={styles.spinner} />
          </div>
        ) : (
          <>
            {tab === 'Overview' && stats && <OverviewTab stats={stats} />}
            {tab === 'Users' && (
              <UsersTab users={users} onToggleBan={toggleUserBan} />
            )}
            {tab === 'Rooms' && (
              <RoomsTab rooms={rooms} onToggleStatus={toggleRoomStatus} />
            )}
            {tab === 'Ads' && (
              <AdsTab ads={ads} onChange={setAds} onSave={saveAds} />
            )}
          </>
        )}
      </main>

      {/* Toast */}
      {toast && <div style={styles.toast}>{toast}</div>}
    </div>
  );
}

function OverviewTab({ stats }) {
  const cards = [
    { label: 'Total Users', value: stats.totalUsers ?? 0, color: '#a855f7' },
    { label: 'Active Rooms', value: stats.activeRooms ?? 0, color: '#3b82f6' },
    { label: 'Total Rooms', value: stats.totalRooms ?? 0, color: '#10b981' },
    { label: 'Tracks Played', value: stats.tracksPlayed ?? 0, color: '#f59e0b' },
  ];
  return (
    <div>
      <div style={styles.statsGrid}>
        {cards.map((c) => (
          <div key={c.label} style={styles.statCard}>
            <p style={{ color: '#a1a1aa', fontSize: 13, marginBottom: 8 }}>{c.label}</p>
            <p style={{ color: c.color, fontSize: 36, fontWeight: 700 }}>{c.value.toLocaleString()}</p>
          </div>
        ))}
      </div>
      {stats.recentActivity && stats.recentActivity.length > 0 && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Recent Activity</h2>
          <div style={styles.table}>
            <div style={styles.tableHeader}>
              <span style={{ flex: 2 }}>Action</span>
              <span style={{ flex: 1 }}>User</span>
              <span style={{ flex: 1 }}>Time</span>
            </div>
            {stats.recentActivity.slice(0, 10).map((item, i) => (
              <div key={i} style={styles.tableRow}>
                <span style={{ flex: 2, color: '#e4e4e7' }}>{item.action}</span>
                <span style={{ flex: 1, color: '#a1a1aa', fontSize: 13 }}>{item.userId?.slice(0, 8)}…</span>
                <span style={{ flex: 1, color: '#71717a', fontSize: 12 }}>
                  {new Date(item.createdAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function UsersTab({ users, onToggleBan }) {
  const [search, setSearch] = useState('');
  const filtered = users.filter(
    (u) =>
      u.display_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
  );
  return (
    <div>
      <input
        style={styles.searchInput}
        placeholder="Search users..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div style={styles.table}>
        <div style={styles.tableHeader}>
          <span style={{ flex: 2 }}>User</span>
          <span style={{ flex: 2 }}>Email</span>
          <span style={{ flex: 1 }}>Rooms Joined</span>
          <span style={{ flex: 1 }}>Status</span>
          <span style={{ flex: 1 }}>Action</span>
        </div>
        {filtered.map((u) => (
          <div key={u.uid} style={styles.tableRow}>
            <span style={{ flex: 2, color: '#e4e4e7' }}>{u.display_name || '—'}</span>
            <span style={{ flex: 2, color: '#a1a1aa', fontSize: 13 }}>{u.email || '—'}</span>
            <span style={{ flex: 1, color: '#71717a' }}>{u.rooms_joined_count ?? 0}</span>
            <span style={{ flex: 1 }}>
              <span style={{ ...styles.badge, background: u.banned ? '#7f1d1d' : '#14532d', color: u.banned ? '#fca5a5' : '#86efac' }}>
                {u.banned ? 'Banned' : 'Active'}
              </span>
            </span>
            <span style={{ flex: 1 }}>
              <button
                style={{ ...styles.actionBtn, background: u.banned ? '#14532d' : '#7f1d1d' }}
                onClick={() => onToggleBan(u.uid, u.banned)}
              >
                {u.banned ? 'Unban' : 'Ban'}
              </button>
            </span>
          </div>
        ))}
      </div>
      {filtered.length === 0 && <p style={styles.emptyMsg}>No users found.</p>}
    </div>
  );
}

function RoomsTab({ rooms, onToggleStatus }) {
  return (
    <div>
      <div style={styles.table}>
        <div style={styles.tableHeader}>
          <span style={{ flex: 1 }}>Code</span>
          <span style={{ flex: 2 }}>Host</span>
          <span style={{ flex: 1 }}>Members</span>
          <span style={{ flex: 1 }}>Status</span>
          <span style={{ flex: 1 }}>Action</span>
        </div>
        {rooms.map((r) => (
          <div key={r.id} style={styles.tableRow}>
            <span style={{ flex: 1, color: '#a855f7', fontFamily: 'monospace', fontWeight: 600 }}>{r.code}</span>
            <span style={{ flex: 2, color: '#e4e4e7', fontSize: 13 }}>{r.host_id?.slice(0, 12)}…</span>
            <span style={{ flex: 1, color: '#71717a' }}>{r.member_count ?? 0}</span>
            <span style={{ flex: 1 }}>
              <span style={{ ...styles.badge, background: r.active ? '#14532d' : '#3f3f46', color: r.active ? '#86efac' : '#a1a1aa' }}>
                {r.active ? 'Active' : 'Ended'}
              </span>
            </span>
            <span style={{ flex: 1 }}>
              <button
                style={{ ...styles.actionBtn, background: r.active ? '#7f1d1d' : '#14532d' }}
                onClick={() => onToggleStatus(r.id, r.active)}
              >
                {r.active ? 'End' : 'Reopen'}
              </button>
            </span>
          </div>
        ))}
      </div>
      {rooms.length === 0 && <p style={styles.emptyMsg}>No rooms found.</p>}
    </div>
  );
}

function AdsTab({ ads, onChange, onSave }) {
  return (
    <div style={styles.adsContainer}>
      <div style={styles.section}>
        <label style={styles.label}>Header Ad Code</label>
        <p style={styles.hint}>Paste ad script or HTML to inject in the page header.</p>
        <textarea
          style={styles.codeArea}
          value={ads.headerCode || ''}
          onChange={(e) => onChange((prev) => ({ ...prev, headerCode: e.target.value }))}
          placeholder="<!-- Header ad code -->"
          rows={6}
        />
      </div>
      <div style={styles.section}>
        <label style={styles.label}>Footer Ad Code</label>
        <p style={styles.hint}>Paste ad script or HTML to inject at the page footer.</p>
        <textarea
          style={styles.codeArea}
          value={ads.footerCode || ''}
          onChange={(e) => onChange((prev) => ({ ...prev, footerCode: e.target.value }))}
          placeholder="<!-- Footer ad code -->"
          rows={6}
        />
      </div>
      <button style={styles.saveBtn} onClick={onSave}>
        Save Ads Configuration
      </button>
    </div>
  );
}

function tabIcon(tab) {
  const icons = {
    Overview: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 8 }}>
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
        <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
      </svg>
    ),
    Users: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 8 }}>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
    Rooms: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 8 }}>
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
    Ads: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 8 }}>
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
      </svg>
    ),
  };
  return icons[tab] || null;
}

const styles = {
  layout: {
    display: 'flex',
    minHeight: '100vh',
    background: '#09090b',
  },
  sidebar: {
    width: 240,
    minHeight: '100vh',
    background: '#111113',
    borderRight: '1px solid #27272a',
    display: 'flex',
    flexDirection: 'column',
    padding: '24px 16px',
    position: 'sticky',
    top: 0,
    height: '100vh',
    overflow: 'auto',
  },
  logo: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 32,
    padding: '0 8px',
  },
  logoText: { color: '#fff', fontSize: 22, fontWeight: 700 },
  logoAdmin: { color: '#a855f7', fontSize: 13, fontWeight: 600, letterSpacing: 1 },
  nav: { flex: 1, display: 'flex', flexDirection: 'column', gap: 4 },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 12px',
    borderRadius: 10,
    border: 'none',
    background: 'transparent',
    color: '#a1a1aa',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
    transition: 'all 0.15s',
  },
  navItemActive: {
    background: '#27272a',
    color: '#fff',
  },
  userSection: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '12px 8px',
    borderTop: '1px solid #27272a',
    marginTop: 16,
  },
  avatar: { width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' },
  userName: { color: '#e4e4e7', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  userEmail: { color: '#71717a', fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  signOutBtn: {
    background: 'transparent',
    border: 'none',
    color: '#71717a',
    cursor: 'pointer',
    padding: 4,
    borderRadius: 6,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  main: { flex: 1, padding: 32, overflowY: 'auto', maxWidth: 'calc(100vw - 240px)' },
  header: { marginBottom: 24 },
  pageTitle: { color: '#fff', fontSize: 24, fontWeight: 700 },
  loadingCenter: { display: 'flex', justifyContent: 'center', padding: 60 },
  spinner: {
    width: 36,
    height: 36,
    border: '3px solid #27272a',
    borderTop: '3px solid #a855f7',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: 16,
    marginBottom: 32,
  },
  statCard: {
    background: '#18181b',
    border: '1px solid #27272a',
    borderRadius: 14,
    padding: '20px 24px',
  },
  section: { marginBottom: 24 },
  sectionTitle: { color: '#e4e4e7', fontSize: 16, fontWeight: 600, marginBottom: 16 },
  table: { background: '#18181b', border: '1px solid #27272a', borderRadius: 12, overflow: 'hidden' },
  tableHeader: {
    display: 'flex',
    padding: '12px 16px',
    background: '#111113',
    borderBottom: '1px solid #27272a',
    color: '#71717a',
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  tableRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '14px 16px',
    borderBottom: '1px solid #27272a',
    fontSize: 14,
  },
  badge: {
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 600,
  },
  actionBtn: {
    padding: '5px 14px',
    border: 'none',
    borderRadius: 8,
    color: '#fff',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  },
  searchInput: {
    width: '100%',
    maxWidth: 320,
    padding: '10px 14px',
    background: '#18181b',
    border: '1px solid #27272a',
    borderRadius: 10,
    color: '#e4e4e7',
    fontSize: 14,
    marginBottom: 16,
    outline: 'none',
  },
  emptyMsg: { color: '#71717a', textAlign: 'center', padding: 32 },
  adsContainer: { maxWidth: 700 },
  label: { color: '#e4e4e7', fontSize: 14, fontWeight: 600, display: 'block', marginBottom: 4 },
  hint: { color: '#71717a', fontSize: 12, marginBottom: 10 },
  codeArea: {
    width: '100%',
    background: '#18181b',
    border: '1px solid #27272a',
    borderRadius: 10,
    color: '#e4e4e7',
    fontSize: 13,
    fontFamily: 'monospace',
    padding: 14,
    resize: 'vertical',
    outline: 'none',
  },
  saveBtn: {
    padding: '12px 28px',
    background: '#a855f7',
    border: 'none',
    borderRadius: 10,
    color: '#fff',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
  },
  toast: {
    position: 'fixed',
    bottom: 32,
    left: '50%',
    transform: 'translateX(-50%)',
    background: '#27272a',
    color: '#e4e4e7',
    padding: '12px 24px',
    borderRadius: 12,
    fontSize: 14,
    fontWeight: 500,
    border: '1px solid #3f3f46',
    zIndex: 9999,
    boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
  },
};
