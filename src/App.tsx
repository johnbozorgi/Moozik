import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Music, Plus, Search, Users, Play, Pause, SkipForward, Share2, LogIn, Crown, Trash2, ExternalLink, Settings, ChevronLeft, Star, Bell, UserPlus, UserMinus, Check, X, Upload, Home, TrendingUp, Shield, Ban, MicOff, Mic, MoreVertical } from 'lucide-react';
import { auth, db } from './firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { collection, doc, onSnapshot, query, where, orderBy, addDoc, updateDoc, deleteDoc, serverTimestamp, getDoc, getDocs, setDoc, limit, increment } from 'firebase/firestore';
import { QRCodeSVG } from 'qrcode.react';
import YouTube from 'react-youtube';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- Utils ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
interface Track {
  id: string;
  youtubeId: string;
  title: string;
  thumbnail: string;
  addedBy: string;
  addedByUid: string;
  isWildcard: boolean;
  sortOrder: number;
  status: 'queued' | 'playing' | 'played';
  createdAt: any;
}

interface UserProfile {
  uid: string;
  displayName: string;
  username: string;
  photoURL: string;
  rating: number;
  ratingCount: number;
  songsAddedCount: number;
  roomsJoinedCount: number;
  followersCount: number;
  followingCount: number;
  bio?: string;
  createdAt: any;
}

interface UserSettings {
  uid: string;
  notifyOnFollow: boolean;
  notifyOnNewRoom: boolean;
  notifyOnNewMusic: boolean;
  notifyOnNewPlaylist: boolean;
}

interface Notification {
  id: string;
  toUid: string;
  fromUid?: string;
  fromName?: string;
  type: 'follow' | 'new_room' | 'new_music' | 'new_playlist';
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: any;
}

interface Playlist {
  id: string;
  name: string;
  uid: string;
  isPublic: boolean;
  createdAt: any;
}

interface PlaylistItem {
  id: string;
  youtubeId: string;
  title: string;
  thumbnail: string;
  createdAt: any;
}

interface Room {
  id: string;
  hostId: string;
  roomCode: string;
  name: string;
  vibe?: string;
  status: 'active' | 'ended';
  currentTrackId?: string;
  isPlaying: boolean;
  isAudioOnly: boolean;
  requiresApproval: boolean;
  bannedUids: string[];
  progress: number;
  createdAt: any;
}

interface RoomJoinRequest {
  id: string;
  roomId: string;
  uid: string;
  displayName: string;
  photoURL: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: any;
}

interface RoomMember {
  id: string;
  roomId: string;
  uid: string;
  displayName: string;
  photoURL: string;
  isMuted: boolean;
  joinedAt: any;
}

interface Recommendation {
  id: string;
  youtubeId: string;
  title: string;
  thumbnail: string;
  uid: string;
  createdAt: any;
}

// --- Components ---

const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' }>(
  ({ className, variant = 'primary', ...props }, ref) => {
    const variants = {
      primary: 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20',
      secondary: 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700',
      ghost: 'bg-transparent hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100',
      danger: 'bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20',
    };
    return (
      <button
        ref={ref}
        className={cn('px-4 py-2 rounded-xl font-medium transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2', variants[variant], className)}
        {...props}
      />
    );
  }
);

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn('w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all', className)}
      {...props}
    />
  )
);

interface SidebarItemProps {
  icon: any;
  label: string;
  active?: boolean;
  onClick: () => void;
}

function SidebarItem({ icon: Icon, label, active, onClick }: SidebarItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-xl transition-all group relative",
        active 
          ? "bg-emerald-500/10 text-emerald-500 font-bold" 
          : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
      )}
    >
      <Icon className={cn("w-5 h-5 transition-transform group-hover:scale-110", active && "text-emerald-500")} />
      <span className="text-sm">{label}</span>
      {active && (
        <motion.div 
          layoutId="sidebar-active"
          className="absolute left-0 w-1 h-6 bg-emerald-500 rounded-r-full"
        />
      )}
    </button>
  );
}

function AdminDashboard({ user, showToast }: { user: any, showToast: (m: string, t?: 'success' | 'error' | 'info') => void }) {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'groups'>('overview');
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalRooms: 0,
    totalSongs: 0,
    dailySongs: 0,
    weeklySongs: 0,
    monthlySongs: 0,
  });
  const [users, setUsers] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [adsCode, setAdsCode] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.email !== 'johnbozorgi@gmail.com') {
      setLoading(false);
      return;
    }

    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setStats(prev => ({ ...prev, totalUsers: snap.size }));
    });

    const unsubRooms = onSnapshot(collection(db, 'rooms'), (snap) => {
      setRooms(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setStats(prev => ({ ...prev, totalRooms: snap.size }));
    });

    const unsubAds = onSnapshot(doc(db, 'settings', 'ads'), (docSnap) => {
      if (docSnap.exists()) {
        setAdsCode(docSnap.data().code || '');
      }
    });

    const unsubPlays = onSnapshot(collection(db, 'play_history'), (snap) => {
      const plays = snap.docs.map(d => d.data());
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      let daily = 0, weekly = 0, monthly = 0;
      plays.forEach(play => {
        if (!play.createdAt) return;
        const playDate = play.createdAt.toDate();
        if (playDate >= oneDayAgo) daily++;
        if (playDate >= oneWeekAgo) weekly++;
        if (playDate >= oneMonthAgo) monthly++;
      });

      setStats(prev => ({
        ...prev,
        totalSongs: plays.length,
        dailySongs: daily,
        weeklySongs: weekly,
        monthlySongs: monthly,
      }));
      setLoading(false);
    });

    return () => {
      unsubUsers();
      unsubRooms();
      unsubAds();
      unsubPlays();
    };
  }, [user]);

  const saveAdsCode = async () => {
    try {
      await setDoc(doc(db, 'settings', 'ads'), { code: adsCode });
      showToast('Ads code saved successfully', 'success');
    } catch (error) {
      console.error(error);
      showToast('Failed to save ads code', 'error');
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'users', userId), { isBanned: !currentStatus });
      setUsers(users.map(u => u.id === userId ? { ...u, isBanned: !currentStatus } : u));
      showToast(`User ${!currentStatus ? 'banned' : 'unbanned'}`, 'success');
    } catch (error) {
      console.error(error);
      showToast('Failed to update user', 'error');
    }
  };

  const toggleRoomStatus = async (roomId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'active' ? 'ended' : 'active';
      await updateDoc(doc(db, 'rooms', roomId), { status: newStatus });
      setRooms(rooms.map(r => r.id === roomId ? { ...r, status: newStatus } : r));
      showToast(`Room ${newStatus}`, 'success');
    } catch (error) {
      console.error(error);
      showToast('Failed to update room', 'error');
    }
  };

  if (user?.email !== 'johnbozorgi@gmail.com') {
    return (
      <div className="p-8 flex flex-col items-center justify-center text-center space-y-4">
        <Shield className="w-12 h-12 text-red-500" />
        <h2 className="text-2xl font-bold">Access Denied</h2>
        <p className="text-zinc-500">You do not have permission to view the admin dashboard.</p>
      </div>
    );
  }

  if (loading) return <div className="p-8 flex items-center justify-center text-zinc-500">Loading Admin Dashboard...</div>;

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-red-500/20 rounded-2xl flex items-center justify-center shrink-0">
            <Shield className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight">Admin Dashboard</h2>
            <p className="text-zinc-500 text-sm">Manage your platform</p>
          </div>
        </div>
        <div className="flex gap-2 bg-zinc-900 p-1 rounded-2xl border border-zinc-800 overflow-x-auto custom-scrollbar">
          {(['overview', 'users', 'groups'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-4 py-2 text-sm font-bold rounded-xl transition-all capitalize",
                activeTab === tab ? "bg-emerald-500 text-white" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl">
              <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest mb-2">Total Rooms</p>
              <p className="text-4xl font-black text-white">{stats.totalRooms.toLocaleString()}</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl">
              <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest mb-2">Total Songs Played</p>
              <p className="text-4xl font-black text-emerald-500">{stats.totalSongs.toLocaleString()}</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl">
              <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest mb-2">Total Users</p>
              <p className="text-4xl font-black text-blue-500">{stats.totalUsers.toLocaleString()}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl space-y-6">
              <h3 className="text-xl font-bold">Play Analytics</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-zinc-800/30 rounded-2xl">
                  <span className="text-zinc-400 font-medium">Daily Plays (24h)</span>
                  <span className="text-2xl font-black text-white">{stats.dailySongs.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-zinc-800/30 rounded-2xl">
                  <span className="text-zinc-400 font-medium">Weekly Plays (7d)</span>
                  <span className="text-2xl font-black text-emerald-500">{stats.weeklySongs.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-zinc-800/30 rounded-2xl">
                  <span className="text-zinc-400 font-medium">Monthly Plays (30d)</span>
                  <span className="text-2xl font-black text-blue-500">{stats.monthlySongs.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl space-y-6">
              <h3 className="text-xl font-bold">Advertisement Management</h3>
              <p className="text-sm text-zinc-400">Enter your Google AdSense code snippet below. If provided, ads will be displayed in the app.</p>
              <textarea
                className="w-full h-32 bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-sm font-mono text-zinc-300 focus:outline-none focus:border-emerald-500/50 resize-none"
                placeholder="<!-- Google AdSense Code -->"
                value={adsCode}
                onChange={(e) => setAdsCode(e.target.value)}
              />
              <Button onClick={saveAdsCode} className="w-full">Save Ad Code</Button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden">
          <div className="p-6 border-b border-zinc-800">
            <h3 className="text-xl font-bold">User Management</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-800/50 text-zinc-400">
                <tr>
                  <th className="px-6 py-4 font-medium">User</th>
                  <th className="px-6 py-4 font-medium">Username</th>
                  <th className="px-6 py-4 font-medium">Joined Rooms</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-zinc-800/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img src={u.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.id}`} alt="" className="w-8 h-8 rounded-full" />
                        <span className="font-bold text-white">{u.displayName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-zinc-400">@{u.username}</td>
                    <td className="px-6 py-4 text-zinc-400">{u.roomsJoinedCount || 0}</td>
                    <td className="px-6 py-4">
                      <span className={cn("px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider", u.isBanned ? "bg-red-500/10 text-red-500" : "bg-emerald-500/10 text-emerald-500")}>
                        {u.isBanned ? 'Banned' : 'Active'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button 
                        variant={u.isBanned ? "secondary" : "danger"} 
                        className="text-xs px-3 py-1.5 h-auto"
                        onClick={() => toggleUserStatus(u.id, u.isBanned)}
                      >
                        {u.isBanned ? 'Unban' : 'Ban'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'groups' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden">
          <div className="p-6 border-b border-zinc-800">
            <h3 className="text-xl font-bold">Group (Room) Management</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-800/50 text-zinc-400">
                <tr>
                  <th className="px-6 py-4 font-medium">Room Name</th>
                  <th className="px-6 py-4 font-medium">Code</th>
                  <th className="px-6 py-4 font-medium">Host ID</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {rooms.map(r => (
                  <tr key={r.id} className="hover:bg-zinc-800/20 transition-colors">
                    <td className="px-6 py-4 font-bold text-white">{r.name}</td>
                    <td className="px-6 py-4 font-mono text-zinc-400">{r.roomCode}</td>
                    <td className="px-6 py-4 text-zinc-500 text-xs truncate max-w-[150px]">{r.hostId}</td>
                    <td className="px-6 py-4">
                      <span className={cn("px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider", r.status === 'active' ? "bg-emerald-500/10 text-emerald-500" : "bg-zinc-500/10 text-zinc-500")}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button 
                        variant={r.status === 'active' ? "danger" : "secondary"} 
                        className="text-xs px-3 py-1.5 h-auto"
                        onClick={() => toggleRoomStatus(r.id, r.status)}
                      >
                        {r.status === 'active' ? 'Deactivate' : 'Activate'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'landing' | 'host' | 'guest' | 'discovery' | 'profile_edit' | 'settings' | 'trending' | 'admin'>('landing');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [roomName, setRoomName] = useState('');
  const [vibe, setVibe] = useState('');
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [queue, setQueue] = useState<Track[]>([]);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [discoveryUsers, setDiscoveryUsers] = useState<UserProfile[]>([]);
  const [discoverySearch, setDiscoverySearch] = useState('');
  const [discoverySort, setDiscoverySort] = useState<'rating' | 'followers' | 'newest'>('rating');
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null);
  const [selectedProfilePlaylists, setSelectedProfilePlaylists] = useState<Playlist[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [following, setFollowing] = useState<string[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [trendingSongs, setTrendingSongs] = useState<any[]>([]);
  const [trendingPeriod, setTrendingPeriod] = useState<'day' | 'week' | 'month'>('week');
  const [trendingSort, setTrendingSort] = useState<'most' | 'least'>('most');
  const [joinRequests, setJoinRequests] = useState<RoomJoinRequest[]>([]);
  const [roomMembers, setRoomMembers] = useState<RoomMember[]>([]);
  const [pendingJoinRequest, setPendingJoinRequest] = useState<RoomJoinRequest | null>(null);
  const [isBanned, setIsBanned] = useState(false);
  const [adsCode, setAdsCode] = useState('');

  useEffect(() => {
    // Fetch Ads Code
    const fetchAds = async () => {
      try {
        const adsDoc = await getDoc(doc(db, 'settings', 'ads'));
        if (adsDoc.exists()) {
          setAdsCode(adsDoc.data().code || '');
        }
      } catch (e) {
        console.error("Failed to load ads", e);
      }
    };
    fetchAds();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const room = params.get('room');
    if (room && user) {
      setRoomCode(room);
      joinRoom(room);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [user]);

  useEffect(() => {
    if (view === 'trending' || view === 'landing') {
      const now = new Date();
      let startTime = new Date();
      if (trendingPeriod === 'day') startTime.setDate(now.getDate() - 1);
      else if (trendingPeriod === 'week') startTime.setDate(now.getDate() - 7);
      else if (trendingPeriod === 'month') startTime.setMonth(now.getMonth() - 1);

      const q = query(collection(db, 'play_history'), where('createdAt', '>=', startTime), limit(500));
      const unsubscribe = onSnapshot(q, (s) => {
        const recs = s.docs.map(d => d.data());
        const counts: { [key: string]: any } = {};
        recs.forEach(r => {
          if (!counts[r.youtubeId]) {
            counts[r.youtubeId] = { ...r, count: 0 };
          }
          counts[r.youtubeId].count += 1;
        });
        const sorted = Object.values(counts).sort((a, b) => 
          trendingSort === 'most' ? b.count - a.count : a.count - b.count
        ).slice(0, 10);
        setTrendingSongs(sorted);
      });
      return () => unsubscribe();
    }
  }, [view, trendingPeriod, trendingSort]);

  const sendNotification = async (toUid: string, type: Notification['type'], message: string, link?: string) => {
    if (!user || user.uid === toUid) return;
    
    // Check recipient settings
    const settingsRef = doc(db, 'userSettings', toUid);
    const settingsSnap = await getDoc(settingsRef);
    if (settingsSnap.exists()) {
      const settings = settingsSnap.data() as UserSettings;
      const shouldNotify = 
        (type === 'follow' && settings.notifyOnFollow) ||
        (type === 'new_room' && settings.notifyOnNewRoom) ||
        (type === 'new_music' && settings.notifyOnNewMusic) ||
        (type === 'new_playlist' && settings.notifyOnNewPlaylist);
      
      if (!shouldNotify) return;
    }

    await addDoc(collection(db, 'notifications'), {
      toUid,
      fromUid: user.uid,
      fromName: profile?.displayName || 'Someone',
      type,
      message,
      link,
      isRead: false,
      createdAt: serverTimestamp()
    });
  };

  const followUser = async (targetUid: string) => {
    if (!user || user.uid === targetUid) return;
    const followId = `${user.uid}_${targetUid}`;
    await setDoc(doc(db, 'follows', followId), {
      followerUid: user.uid,
      followedUid: targetUid,
      createdAt: serverTimestamp()
    });

    // Update counts
    await updateDoc(doc(db, 'users', user.uid), { followingCount: increment(1) });
    await updateDoc(doc(db, 'users', targetUid), { followersCount: increment(1) });

    // Send notification
    await sendNotification(targetUid, 'follow', `${profile?.displayName} started following you!`);
  };

  const unfollowUser = async (targetUid: string) => {
    if (!user) return;
    const followId = `${user.uid}_${targetUid}`;
    await deleteDoc(doc(db, 'follows', followId));

    // Update counts
    await updateDoc(doc(db, 'users', user.uid), { followingCount: increment(-1) });
    await updateDoc(doc(db, 'users', targetUid), { followersCount: increment(-1) });
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 800000) {
        showToast('File is too large! Please choose an image smaller than 800KB.', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        updateProfile({ photoURL: base64String });
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        // Ensure user profile exists
        const userRef = doc(db, 'users', u.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          const newProfile = {
            uid: u.uid,
            displayName: u.displayName || 'Anonymous',
            username: u.email?.split('@')[0] || u.uid.substring(0, 5),
            photoURL: u.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.uid}`,
            rating: 0,
            ratingCount: 0,
            songsAddedCount: 0,
            roomsJoinedCount: 0,
            followersCount: 0,
            followingCount: 0,
            createdAt: serverTimestamp(),
          };
          await setDoc(userRef, newProfile);
          setProfile(newProfile as any);
        } else {
          setProfile({ uid: u.uid, ...userSnap.data() } as UserProfile);
        }

        // Subscribe to profile changes
        onSnapshot(userRef, (s) => {
          if (s.exists()) setProfile({ uid: s.id, ...s.data() } as UserProfile);
        });

        // Subscribe to user playlists
        onSnapshot(query(collection(db, 'playlists'), where('uid', '==', u.uid)), (s) => {
          setPlaylists(s.docs.map(d => ({ id: d.id, ...d.data() } as Playlist)));
        });

        // Ensure user settings exist
        const settingsRef = doc(db, 'userSettings', u.uid);
        const settingsSnap = await getDoc(settingsRef);
        if (!settingsSnap.exists()) {
          const defaultSettings = {
            uid: u.uid,
            notifyOnFollow: true,
            notifyOnNewRoom: true,
            notifyOnNewMusic: true,
            notifyOnNewPlaylist: true,
          };
          await setDoc(settingsRef, defaultSettings);
          setUserSettings(defaultSettings);
        } else {
          setUserSettings(settingsSnap.data() as UserSettings);
        }

        // Subscribe to settings
        onSnapshot(settingsRef, (s) => {
          if (s.exists()) setUserSettings(s.data() as UserSettings);
        });

        // Subscribe to notifications
        onSnapshot(query(collection(db, 'notifications'), where('toUid', '==', u.uid), orderBy('createdAt', 'desc'), limit(50)), (s) => {
          setNotifications(s.docs.map(d => ({ id: d.id, ...d.data() } as Notification)));
        });

        // Subscribe to following
        onSnapshot(query(collection(db, 'follows'), where('followerUid', '==', u.uid)), (s) => {
          setFollowing(s.docs.map(d => d.data().followedUid));
        });
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (view === 'discovery') {
      onSnapshot(query(collection(db, 'users'), limit(20)), (s) => {
        setDiscoveryUsers(s.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile)));
      });
    }
  }, [view]);

  useEffect(() => {
    if (selectedProfile) {
      const q = query(collection(db, 'playlists'), where('uid', '==', selectedProfile.uid), where('isPublic', '==', true));
      const unsubscribe = onSnapshot(q, (s) => {
        setSelectedProfilePlaylists(s.docs.map(d => ({ id: d.id, ...d.data() } as Playlist)));
      });
      return () => unsubscribe();
    } else {
      setSelectedProfilePlaylists([]);
    }
  }, [selectedProfile]);

  const login = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const createRoom = async (customName?: string) => {
    if (!user) return;
    try {
      const finalRoomName = customName?.trim() || roomName.trim() || `${profile?.displayName || 'Anonymous'}'s Vibe`;
      const code = Array.from({ length: 5 }, () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[Math.floor(Math.random() * 36)]).join('');
      console.log("Creating room doc...");
      const roomRef = await addDoc(collection(db, 'rooms'), {
        hostId: user.uid,
        roomCode: code,
        name: finalRoomName,
        vibe: vibe || 'General Mix',
        status: 'active',
        isPlaying: false,
        isAudioOnly: true,
        requiresApproval,
        bannedUids: [],
        progress: 0,
        createdAt: serverTimestamp(),
      });

      console.log("Adding host as member...");
      // Add host as member
      await setDoc(doc(db, 'rooms', roomRef.id, 'members', user.uid), {
        roomId: roomRef.id,
        uid: user.uid,
        displayName: profile?.displayName || 'Anonymous',
        photoURL: profile?.photoURL || '',
        isMuted: false,
        joinedAt: serverTimestamp()
      });

      console.log("Incrementing user room count...");
      // Increment user's room count
      await updateDoc(doc(db, 'users', user.uid), {
        roomsJoinedCount: increment(1)
      });

      console.log("Notifying followers...");
      // Notify followers
      const followersQuery = query(collection(db, 'follows'), where('followedUid', '==', user.uid));
      getDocs(followersQuery).then((s) => {
        s.docs.forEach(d => {
          sendNotification(d.data().followerUid, 'new_room', `${profile?.displayName} created a new room: ${finalRoomName}`, `/join/${code}`);
        });
      }).catch(console.error);

      console.log("Setting view to host...");
      setRoomCode(code);
      setView('host');
    } catch (error: any) {
      console.error("Error creating room:", error);
      showToast(error.message || "Failed to create room", "error");
    }
  };

  const createPlaylist = async (name: string, isPublic = false) => {
    if (!user || !name.trim()) return;
    await addDoc(collection(db, 'playlists'), {
      uid: user.uid,
      name,
      isPublic,
      createdAt: serverTimestamp(),
    });

    if (isPublic) {
      const followersQuery = query(collection(db, 'follows'), where('followedUid', '==', user.uid));
      getDocs(followersQuery).then((s) => {
        s.docs.forEach(d => {
          sendNotification(d.data().followerUid, 'new_playlist', `${profile?.displayName} added a new public playlist: ${name}`);
        });
      }).catch(console.error);
    }
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!user) return;
    await updateDoc(doc(db, 'users', user.uid), data);
    showToast('Profile updated!', 'success');
  };

  const rateUser = async (targetUid: string, score: number) => {
    if (!user || user.uid === targetUid) return;
    const ratingRef = doc(db, 'ratings', `${user.uid}_${targetUid}`);
    const ratingSnap = await getDoc(ratingRef);
    
    if (ratingSnap.exists()) {
      showToast('You already rated this user!', 'error');
      return;
    }

    await setDoc(ratingRef, {
      fromUid: user.uid,
      toUid: targetUid,
      score,
      createdAt: serverTimestamp()
    });

    // Update target user's average rating
    const targetRef = doc(db, 'users', targetUid);
    const targetSnap = await getDoc(targetRef);
    if (targetSnap.exists()) {
      const data = targetSnap.data();
      const currentRating = data.rating || 0;
      const currentCount = data.ratingCount || 0;
      const newCount = currentCount + 1;
      const newRating = (currentRating * currentCount + score) / newCount;
      
      await updateDoc(targetRef, {
        rating: newRating,
        ratingCount: newCount
      });
    }
    showToast('Rating submitted!', 'success');
  };

  const deleteAccount = async () => {
    if (!user) return;
    if (!window.confirm('Are you sure you want to delete your account? This action is permanent.')) return;
    
    try {
      // Delete user profile and settings
      await deleteDoc(doc(db, 'users', user.uid));
      await deleteDoc(doc(db, 'userSettings', user.uid));
      
      // Sign out
      await signOut(auth);
      setView('landing');
      showToast('Account deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting account:', error);
      showToast('Failed to delete account', 'error');
    }
  };

  const filteredDiscoveryUsers = discoveryUsers
    .filter(u => {
      const search = discoverySearch.toLowerCase();
      return u.displayName.toLowerCase().includes(search) || 
             u.username.toLowerCase().includes(search) ||
             u.uid.toLowerCase().includes(search);
    })
    .sort((a, b) => {
      if (discoverySort === 'rating') return b.rating - a.rating;
      if (discoverySort === 'followers') return b.followersCount - a.followersCount;
      if (discoverySort === 'newest') return (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0);
      return 0;
    });

  const joinRoom = async (code: string) => {
    if (!user) return;
    const q = query(collection(db, 'rooms'), where('roomCode', '==', code.toUpperCase()), where('status', '==', 'active'));
    const unsubscribe = onSnapshot(q, async (s) => {
      if (!s.empty) {
        const roomData = { id: s.docs[0].id, ...s.docs[0].data() } as Room;
        
        if (roomData.bannedUids?.includes(user.uid)) {
          showToast('You are banned from this room.', 'error');
          unsubscribe();
          return;
        }

        if (roomData.requiresApproval && roomData.hostId !== user.uid) {
          const reqRef = doc(db, 'rooms', roomData.id, 'requests', user.uid);
          const reqSnap = await getDoc(reqRef);
          
          if (reqSnap.exists()) {
            const reqData = reqSnap.data() as RoomJoinRequest;
            if (reqData.status === 'approved') {
              enterRoom(roomData);
              unsubscribe();
            } else if (reqData.status === 'pending') {
              showToast('Your request to join is still pending.', 'info');
            } else {
              showToast('Your request to join was rejected.', 'error');
            }
          } else {
            await setDoc(reqRef, {
              roomId: roomData.id,
              uid: user.uid,
              displayName: profile?.displayName || 'Anonymous',
              photoURL: profile?.photoURL || '',
              status: 'pending',
              createdAt: serverTimestamp()
            });
            showToast('Request sent to host. Please wait for approval.', 'info');
          }
        } else {
          enterRoom(roomData);
          unsubscribe();
        }
      } else {
        showToast('Room not found or ended', 'error');
      }
    });
  };

  const enterRoom = async (roomData: Room) => {
    setCurrentRoom(roomData);
    if (roomData.hostId === user.uid) {
      setView('host');
    } else {
      setView('guest');
    }
    
    await setDoc(doc(db, 'rooms', roomData.id, 'members', user.uid), {
      roomId: roomData.id,
      uid: user.uid,
      displayName: profile?.displayName || 'Anonymous',
      photoURL: profile?.photoURL || '',
      isMuted: false,
      joinedAt: serverTimestamp()
    });

    onSnapshot(query(collection(db, 'rooms', roomData.id, 'queue'), orderBy('sortOrder', 'asc')), (qs) => {
      setQueue(qs.docs.map(d => ({ id: d.id, ...d.data() } as Track)));
    });

    onSnapshot(collection(db, 'rooms', roomData.id, 'members'), (s) => {
      setRoomMembers(s.docs.map(d => ({ id: d.id, ...d.data() } as RoomMember)));
    });
  };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-zinc-500">Loading...</div>;

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex">
      {/* Sidebar (Desktop) */}
      {user && (
        <div className="hidden md:flex w-64 border-r border-zinc-800 flex-col p-4 gap-6 sticky top-0 h-screen shrink-0">
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Music className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">Ridio</span>
          </div>

          <nav className="flex flex-col gap-1">
            <SidebarItem icon={Home} label="Home" active={view === 'landing'} onClick={() => setView('landing')} />
            <SidebarItem icon={TrendingUp} label="Trending" active={view === 'trending'} onClick={() => setView('trending')} />
            <SidebarItem icon={Users} label="Discovery" active={view === 'discovery'} onClick={() => setView('discovery')} />
            <SidebarItem icon={Settings} label="Settings" active={view === 'settings'} onClick={() => setView('settings')} />
            {user?.email === 'johnbozorgi@gmail.com' && (
              <SidebarItem icon={Shield} label="Admin" active={view === 'admin'} onClick={() => setView('admin')} />
            )}
          </nav>

          <div className="mt-auto p-2">
            {adsCode && (
              <div className="mb-4 p-2 bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
                <div dangerouslySetInnerHTML={{ __html: adsCode }} />
              </div>
            )}
            <button 
              onClick={() => setView('settings')}
              className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-zinc-800 transition-all group"
            >
              <img 
                src={profile?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} 
                alt="Profile" 
                className="w-10 h-10 rounded-lg object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="flex-1 text-left overflow-hidden">
                <p className="font-medium text-sm truncate">{profile?.displayName}</p>
                <p className="text-xs text-zinc-500 truncate">@{profile?.username}</p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navbar */}
      {user && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-xl border-t border-zinc-800 z-50 px-6 py-3 flex items-center justify-between pb-safe">
          <button onClick={() => setView('landing')} className={cn("flex flex-col items-center gap-1 transition-colors", view === 'landing' ? "text-emerald-500" : "text-zinc-500 hover:text-zinc-300")}>
            <Home className="w-6 h-6" />
            <span className="text-[10px] font-medium">Home</span>
          </button>
          <button onClick={() => setView('trending')} className={cn("flex flex-col items-center gap-1 transition-colors", view === 'trending' ? "text-emerald-500" : "text-zinc-500 hover:text-zinc-300")}>
            <TrendingUp className="w-6 h-6" />
            <span className="text-[10px] font-medium">Trending</span>
          </button>
          <button onClick={() => setView('discovery')} className={cn("flex flex-col items-center gap-1 transition-colors", view === 'discovery' ? "text-emerald-500" : "text-zinc-500 hover:text-zinc-300")}>
            <Users className="w-6 h-6" />
            <span className="text-[10px] font-medium">Discovery</span>
          </button>
          <button onClick={() => setView('settings')} className={cn("flex flex-col items-center gap-1 transition-colors", view === 'settings' ? "text-emerald-500" : "text-zinc-500 hover:text-zinc-300")}>
            <Settings className="w-6 h-6" />
            <span className="text-[10px] font-medium">Settings</span>
          </button>
          {user?.email === 'johnbozorgi@gmail.com' && (
            <button onClick={() => setView('admin')} className={cn("flex flex-col items-center gap-1 transition-colors", view === 'admin' ? "text-emerald-500" : "text-zinc-500 hover:text-zinc-300")}>
              <Shield className="w-6 h-6" />
              <span className="text-[10px] font-medium">Admin</span>
            </button>
          )}
        </div>
      )}

      <div className={cn("flex-1 flex flex-col min-w-0", user ? "pb-20 md:pb-0" : "")}>
        {/* Header */}
        <header className="h-16 border-b border-zinc-800 flex items-center justify-between px-6 sticky top-0 bg-black/80 backdrop-blur-xl z-40">
          <div className="flex items-center gap-4">
            {view !== 'landing' && (
              <Button variant="ghost" className="p-2" onClick={() => { setRoomCode(''); setView('landing'); }}>
                <ChevronLeft className="w-5 h-5" />
              </Button>
            )}
            <h1 className="text-lg font-semibold capitalize">{view === 'host' || view === 'guest' ? 'Room' : view.replace('_', ' ')}</h1>
          </div>

          <div className="flex items-center gap-3">
            {user && (
              <>
                <div className="relative">
                  <Button variant="ghost" className="p-2 relative" onClick={() => setShowNotifications(!showNotifications)}>
                    <Bell className="w-5 h-5" />
                    {notifications.filter(n => !n.isRead).length > 0 && (
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full border-2 border-black" />
                    )}
                  </Button>
                  
                  <AnimatePresence>
                    {showNotifications && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 mt-2 w-80 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-4 z-50 overflow-hidden"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-bold">Notifications</h3>
                          <Button variant="ghost" className="text-xs p-1 h-auto" onClick={async () => {
                            for (const n of notifications.filter(n => !n.isRead)) {
                              await updateDoc(doc(db, 'notifications', n.id), { isRead: true });
                            }
                          }}>Mark all read</Button>
                        </div>
                        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                          {notifications.length === 0 ? (
                            <p className="text-center text-zinc-500 py-8 text-sm">No notifications yet</p>
                          ) : (
                            notifications.map(n => (
                              <div key={n.id} className={cn("p-3 rounded-xl transition-all", n.isRead ? "bg-zinc-800/20" : "bg-emerald-500/5 border border-emerald-500/20")}>
                                <p className="text-sm text-zinc-200">{n.message}</p>
                                <p className="text-[10px] text-zinc-500 mt-1">{n.createdAt?.toDate().toLocaleDateString()}</p>
                              </div>
                            ))
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <Button variant="secondary" onClick={() => signOut(auth)}>Sign Out</Button>
              </>
            )}
            {!user && <Button onClick={() => signInWithPopup(auth, new GoogleAuthProvider())}>Sign In</Button>}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            {view === 'landing' && (
              <motion.div
                key="landing"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="p-4 md:p-8 max-w-6xl mx-auto space-y-12"
              >
                {/* Hero */}
                <section className="text-center space-y-6 py-12">
                  <h2 className="text-5xl font-black tracking-tighter sm:text-7xl">
                    Music is better <br />
                    <span className="text-emerald-500">together.</span>
                  </h2>
                  <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
                    Create a room, share your vibe, and listen with friends in real-time. 
                    The ultimate social listening experience.
                  </p>
                  <div className="flex flex-col sm:flex-row items-start justify-center gap-4 pt-4">
                    <div className="flex w-full sm:w-auto bg-zinc-900 p-1 rounded-2xl border border-zinc-800 focus-within:border-emerald-500/50 transition-all">
                      <input
                        type="text"
                        placeholder="Enter Room Code"
                        className="bg-transparent px-4 py-3 outline-none w-full sm:w-48 font-mono tracking-widest uppercase"
                        value={roomCode}
                        onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                      />
                      <Button onClick={() => joinRoom(roomCode)} className="px-8">Join</Button>
                    </div>
                    <span className="text-zinc-600 font-medium sm:mt-4">or</span>
                    <div className="flex flex-col gap-2 w-full sm:w-auto">
                      <Button variant="secondary" onClick={() => user ? setShowCreateModal(true) : signInWithPopup(auth, new GoogleAuthProvider())} className="px-8 h-[58px] w-full">
                        <Plus className="w-5 h-5" />
                        Create Room
                      </Button>
                    </div>
                  </div>
                </section>

                {/* Trending Section */}
                <section className="space-y-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <TrendingUp className="w-6 h-6 text-emerald-500" />
                      <h3 className="text-2xl font-bold tracking-tight">Trending Now</h3>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800">
                        {(['day', 'week', 'month'] as const).map((p) => (
                          <button
                            key={p}
                            onClick={() => setTrendingPeriod(p)}
                            className={cn(
                              "px-3 py-1.5 text-xs font-bold rounded-lg transition-all capitalize",
                              trendingPeriod === p ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "text-zinc-500 hover:text-zinc-300"
                            )}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                      <select 
                        className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-1.5 text-xs font-bold text-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        value={trendingSort}
                        onChange={(e) => setTrendingSort(e.target.value as any)}
                      >
                        <option value="most">Most Played</option>
                        <option value="least">Least Played</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    {trendingSongs.map((song, i) => (
                      <motion.div
                        key={song.youtubeId}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.05 }}
                        className="group relative bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden hover:border-emerald-500/50 transition-all"
                      >
                        <div className="aspect-video relative">
                          <img src={song.thumbnail} alt={song.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Button variant="ghost" className="p-3 rounded-full bg-emerald-500 text-white hover:scale-110" onClick={() => {
                              const name = `Trending: ${song.title}`;
                              setRoomName(name);
                              createRoom(name);
                            }}>
                              <Play className="w-6 h-6 fill-current" />
                            </Button>
                          </div>
                          <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg text-[10px] font-bold border border-white/10">
                            #{i + 1}
                          </div>
                        </div>
                        <div className="p-4">
                          <h4 className="font-bold text-sm line-clamp-1 group-hover:text-emerald-400 transition-colors">{song.title}</h4>
                          <div className="flex items-center justify-between mt-2">
                            <p className="text-xs text-zinc-500">{song.count} plays</p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </section>
              </motion.div>
            )}

            {view === 'trending' && (
              <motion.div
                key="trending"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-4 md:p-8 max-w-4xl mx-auto space-y-8"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-3xl font-bold tracking-tight">Community Charts</h2>
                    <p className="text-zinc-500">The most played tracks by Ridio users.</p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800">
                      {(['day', 'week', 'month'] as const).map((p) => (
                        <button
                          key={p}
                          onClick={() => setTrendingPeriod(p)}
                          className={cn(
                            "px-4 py-2 text-sm font-bold rounded-lg transition-all capitalize",
                            trendingPeriod === p ? "bg-emerald-500 text-white shadow-lg" : "text-zinc-500 hover:text-zinc-300"
                          )}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                    <select 
                      className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      value={trendingSort}
                      onChange={(e) => setTrendingSort(e.target.value as any)}
                    >
                      <option value="most">Most Played</option>
                      <option value="least">Least Played</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-3">
                  {trendingSongs.map((song, i) => (
                    <div key={song.youtubeId} className="flex items-center gap-4 p-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl group hover:bg-zinc-800/50 transition-all">
                      <div className="relative">
                        <img src={song.thumbnail} alt="" className="w-16 h-16 rounded-xl object-cover" />
                        <div className="absolute -top-2 -left-2 bg-emerald-500 text-white w-6 h-6 rounded-lg flex items-center justify-center font-black text-xs shadow-xl">
                          {i + 1}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold truncate group-hover:text-emerald-400 transition-colors">{song.title}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-500/20">
                            {song.count} Plays
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button onClick={() => {
                          const name = `Vibe: ${song.title}`;
                          setRoomCode('');
                          setRoomName(name);
                          createRoom(name);
                        }}>Listen</Button>
                      </div>
                    </div>
                  ))}
                  {trendingSongs.length === 0 && (
                    <div className="py-20 text-center space-y-4">
                      <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mx-auto">
                        <TrendingUp className="w-8 h-8 text-zinc-700" />
                      </div>
                      <p className="text-zinc-500">No trending tracks found for this period.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {view === 'settings' && (
              <motion.div
                key="settings"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-4 md:p-8 max-w-2xl mx-auto space-y-12"
              >
                <section className="space-y-6">
                  <h2 className="text-2xl font-bold">User Profile</h2>
                  <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-3xl space-y-6">
                    <div className="flex flex-col items-center gap-4">
                      <div className="relative group">
                        <img src={profile?.photoURL} alt="" className="w-32 h-32 rounded-full border-4 border-zinc-800 object-cover group-hover:opacity-50 transition-opacity" referrerPolicy="no-referrer" />
                        <label className="absolute inset-0 flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                          <Upload className="w-8 h-8 text-white" />
                          <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                        </label>
                      </div>
                      <p className="text-[10px] text-zinc-500 uppercase font-bold">Click to upload (Max 800KB)</p>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Display Name</label>
                        <Input value={profile?.displayName} onChange={(e) => setProfile(p => p ? {...p, displayName: e.target.value} : null)} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Username</label>
                        <Input value={profile?.username} onChange={(e) => setProfile(p => p ? {...p, username: e.target.value.replace(/[^a-z0-9_]/gi, '')} : null)} />
                      </div>
                      <Button className="w-full" onClick={() => {
                        if (profile) updateProfile({ displayName: profile.displayName, username: profile.username, photoURL: profile.photoURL });
                      }}>Save Profile Changes</Button>
                    </div>
                  </div>
                </section>

                <section className="space-y-6">
                  <h2 className="text-2xl font-bold">Notification Preferences</h2>
                  <div className="space-y-4">
                    {[
                      { key: 'notifyOnFollow', label: 'New Followers', desc: 'Notify me when someone follows my profile' },
                      { key: 'notifyOnNewRoom', label: 'New Rooms', desc: 'Notify me when people I follow create a room' },
                      { key: 'notifyOnNewMusic', label: 'New Music', desc: 'Notify me when music is added to my active rooms' },
                      { key: 'notifyOnNewPlaylist', label: 'New Playlists', desc: 'Notify me when people I follow add public playlists' },
                    ].map(item => (
                      <div key={item.key} className="flex items-center justify-between p-4 bg-zinc-800/30 rounded-2xl">
                        <div>
                          <p className="font-medium">{item.label}</p>
                          <p className="text-xs text-zinc-500">{item.desc}</p>
                        </div>
                        <button 
                          onClick={() => updateDoc(doc(db, 'userSettings', user.uid), { [item.key]: !userSettings?.[item.key as keyof UserSettings] })}
                          className={cn("w-12 h-6 rounded-full transition-all relative", userSettings?.[item.key as keyof UserSettings] ? "bg-emerald-500" : "bg-zinc-700")}
                        >
                          <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-all", userSettings?.[item.key as keyof UserSettings] ? "left-7" : "left-1")} />
                        </button>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="space-y-6">
                  <h2 className="text-2xl font-bold text-red-500">Danger Zone</h2>
                  <div className="p-6 bg-red-500/5 border border-red-500/20 rounded-3xl space-y-4">
                    <p className="text-sm text-zinc-400">Once you delete your account, there is no going back. Please be certain.</p>
                    <Button variant="danger" className="w-full" onClick={deleteAccount}>Delete My Account</Button>
                  </div>
                </section>
              </motion.div>
            )}

            {view === 'discovery' && (
              <motion.div
                key="discovery"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-4 md:p-8 max-w-6xl mx-auto space-y-8"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <h2 className="text-3xl font-bold tracking-tight">Global Discovery</h2>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative w-full sm:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <Input 
                        placeholder="Search name, username, or ID..." 
                        className="pl-10 py-2" 
                        value={discoverySearch}
                        onChange={(e) => setDiscoverySearch(e.target.value)}
                      />
                    </div>
                    <select 
                      className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      value={discoverySort}
                      onChange={(e) => setDiscoverySort(e.target.value as any)}
                    >
                      <option value="rating">Highest Rated</option>
                      <option value="followers">Most Followed</option>
                      <option value="newest">Newest Members</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {filteredDiscoveryUsers.map(u => (
                    <div key={u.uid} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 flex flex-col items-center text-center space-y-4 hover:border-emerald-500/50 transition-all group relative">
                      <div className="absolute top-4 right-4">
                        {user && user.uid !== u.uid && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              following.includes(u.uid) ? unfollowUser(u.uid) : followUser(u.uid);
                            }}
                            className={cn(
                              "p-2 rounded-full transition-all",
                              following.includes(u.uid) ? "bg-emerald-500 text-white" : "bg-zinc-800 text-zinc-500 hover:text-zinc-300"
                            )}
                          >
                            {following.includes(u.uid) ? <Check className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                          </button>
                        )}
                      </div>
                      <div className="relative cursor-pointer" onClick={() => setSelectedProfile(u)}>
                        <img 
                          src={u.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.uid}`} 
                          alt={u.displayName} 
                          className="w-24 h-24 rounded-2xl object-cover shadow-2xl group-hover:scale-105 transition-transform"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-1.5 rounded-lg shadow-lg">
                          <Star className="w-4 h-4 fill-current" />
                        </div>
                      </div>
                      <div className="cursor-pointer" onClick={() => setSelectedProfile(u)}>
                        <h4 className="font-bold text-lg">{u.displayName}</h4>
                        <p className="text-zinc-500 text-sm">@{u.username}</p>
                        <p className="text-[8px] text-zinc-700 font-mono mt-1 truncate max-w-[120px]">{u.uid}</p>
                      </div>
                      <div className="flex gap-4 text-sm font-medium text-zinc-400">
                        <span>{u.followersCount} followers</span>
                        <span>{u.rating.toFixed(1)} rating</span>
                      </div>
                      <Button variant="secondary" className="w-full" onClick={() => setSelectedProfile(u)}>View Profile</Button>
                    </div>
                  ))}
                  {filteredDiscoveryUsers.length === 0 && (
                    <div className="col-span-full py-20 text-center space-y-4">
                      <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mx-auto">
                        <Search className="w-8 h-8 text-zinc-700" />
                      </div>
                      <p className="text-zinc-500">No users found matching your search.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

        {view === 'host' && (
          <HostView 
            user={user} 
            roomCode={roomCode} 
            onExit={() => setView('landing')} 
            setSelectedProfile={setSelectedProfile} 
            showToast={showToast}
          />
        )}

        {view === 'guest' && currentRoom && (
          <GuestView 
            user={user} 
            room={currentRoom} 
            queue={queue} 
            onExit={() => setView('landing')} 
            setSelectedProfile={setSelectedProfile} 
            sendNotification={sendNotification}
            roomMembers={roomMembers}
            showToast={showToast}
          />
        )}

        {view === 'admin' && (
          <AdminDashboard user={user} showToast={showToast} />
        )}

        {selectedProfile && (
          <div className="fixed inset-0 bg-zinc-950/90 backdrop-blur-md z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-[40px] overflow-hidden shadow-2xl"
            >
              <div className="p-8 space-y-6 max-h-[90vh] overflow-y-auto custom-scrollbar">
                <div className="flex items-center justify-between">
                  <Button variant="ghost" className="p-2" onClick={() => setSelectedProfile(null)}>
                    <ChevronLeft className="w-6 h-6" />
                  </Button>
                  <h3 className="font-bold uppercase tracking-widest text-xs text-zinc-500">Public Profile</h3>
                  {user && user.uid !== selectedProfile.uid && (
                    <Button 
                      variant={following.includes(selectedProfile.uid) ? 'secondary' : 'primary'}
                      onClick={() => following.includes(selectedProfile.uid) ? unfollowUser(selectedProfile.uid) : followUser(selectedProfile.uid)}
                      className="h-10 px-4 text-xs gap-2"
                    >
                      {following.includes(selectedProfile.uid) ? <UserMinus className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                      {following.includes(selectedProfile.uid) ? 'Unfollow' : 'Follow'}
                    </Button>
                  )}
                </div>

                <div className="text-center space-y-4">
                  <div className="relative inline-block">
                    <img src={selectedProfile.photoURL} alt="" className="w-32 h-32 rounded-full border-4 border-zinc-800 object-cover" referrerPolicy="no-referrer" />
                    <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-zinc-950 font-black px-3 py-1 rounded-full text-sm shadow-xl flex items-center gap-1">
                      ★ {selectedProfile.rating.toFixed(1)}
                      <span className="text-[10px] opacity-60">({selectedProfile.ratingCount})</span>
                    </div>
                  </div>
                  <div>
                    <h2 className="text-3xl font-black">{selectedProfile.displayName}</h2>
                    <p className="text-emerald-500 font-mono">@{selectedProfile.username}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-3 bg-zinc-800/50 rounded-2xl">
                      <p className="text-xl font-black">{selectedProfile.followersCount || 0}</p>
                      <p className="text-[8px] text-zinc-500 uppercase font-bold">Followers</p>
                    </div>
                    <div className="p-3 bg-zinc-800/50 rounded-2xl">
                      <p className="text-xl font-black">{selectedProfile.songsAddedCount}</p>
                      <p className="text-[8px] text-zinc-500 uppercase font-bold">Songs</p>
                    </div>
                    <div className="p-3 bg-zinc-800/50 rounded-2xl">
                      <p className="text-xl font-black">{selectedProfile.roomsJoinedCount}</p>
                      <p className="text-[8px] text-zinc-500 uppercase font-bold">Rooms</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Rate this user</h4>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map(star => (
                        <button key={star} onClick={() => rateUser(selectedProfile.uid, star)} className="text-zinc-700 hover:text-amber-500 transition-colors">
                          <Star className="w-6 h-6 fill-current" />
                        </button>
                      ))}
                    </div>
                  </div>

                  {selectedProfilePlaylists.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Public Playlists</h4>
                      <div className="grid grid-cols-1 gap-2">
                        {selectedProfilePlaylists.map(p => (
                          <div key={p.id} className="p-3 bg-zinc-800/30 border border-zinc-800 rounded-2xl flex items-center justify-between">
                            <span className="font-medium text-sm">{p.name}</span>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {showNotifications && (
          <div className="fixed inset-0 bg-zinc-950/90 backdrop-blur-md z-[110] flex items-center justify-center p-6">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-[40px] overflow-hidden shadow-2xl flex flex-col max-h-[80vh]"
            >
              <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
                <h3 className="text-xl font-black">Notifications</h3>
                <Button variant="ghost" className="p-2" onClick={() => setShowNotifications(false)}>
                  <X className="w-6 h-6" />
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                {notifications.length === 0 ? (
                  <div className="text-center py-12 text-zinc-600">
                    <Bell className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p>No notifications yet</p>
                  </div>
                ) : (
                  notifications.map(n => (
                    <div 
                      key={n.id} 
                      className={cn("p-4 rounded-2xl border transition-all cursor-pointer", n.isRead ? "bg-zinc-900/30 border-zinc-800/50" : "bg-emerald-500/5 border-emerald-500/20 shadow-lg shadow-emerald-500/5")}
                      onClick={async () => {
                        await updateDoc(doc(db, 'notifications', n.id), { isRead: true });
                        if (n.link) {
                          setShowNotifications(false);
                        }
                      }}
                    >
                      <div className="flex gap-3">
                        <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0", 
                          n.type === 'follow' ? "bg-blue-500/20 text-blue-500" :
                          n.type === 'new_room' ? "bg-emerald-500/20 text-emerald-500" :
                          n.type === 'new_music' ? "bg-amber-500/20 text-amber-500" :
                          "bg-purple-500/20 text-purple-500"
                        )}>
                          {n.type === 'follow' ? <UserPlus className="w-5 h-5" /> :
                           n.type === 'new_room' ? <Crown className="w-5 h-5" /> :
                           n.type === 'new_music' ? <Music className="w-5 h-5" /> :
                           <Plus className="w-5 h-5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-zinc-100">{n.message}</p>
                          <p className="text-[10px] text-zinc-500 mt-1">
                            {n.createdAt?.toDate().toLocaleDateString()}
                          </p>
                        </div>
                        {!n.isRead && <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2" />}
                      </div>
                    </div>
                  ))
                )}
              </div>
              {notifications.length > 0 && (
                <div className="p-4 border-t border-zinc-800">
                  <Button variant="secondary" className="w-full text-xs" onClick={async () => {
                    const unread = notifications.filter(n => !n.isRead);
                    for (const n of unread) {
                      await updateDoc(doc(db, 'notifications', n.id), { isRead: true });
                    }
                  }}>Mark all as read</Button>
                </div>
              )}
            </motion.div>
          </div>
        )}

        {showSettings && userSettings && (
          <div className="fixed inset-0 bg-zinc-950/90 backdrop-blur-md z-[110] flex items-center justify-center p-6">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-[40px] p-8 space-y-6"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-black">Settings</h3>
                <Button variant="ghost" className="p-2" onClick={() => setShowSettings(false)}>
                  <X className="w-6 h-6" />
                </Button>
              </div>
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Notification Preferences</h4>
                <div className="space-y-3">
                  {[
                    { key: 'notifyOnFollow', label: 'New Followers' },
                    { key: 'notifyOnNewRoom', label: 'Followed User Creates Room' },
                    { key: 'notifyOnNewMusic', label: 'Music Added to My Room' },
                    { key: 'notifyOnNewPlaylist', label: 'Followed User Adds Playlist' },
                  ].map(item => (
                    <div key={item.key} className="flex items-center justify-between p-4 bg-zinc-800/30 rounded-2xl">
                      <span className="text-sm font-medium">{item.label}</span>
                      <button 
                        onClick={() => updateDoc(doc(db, 'userSettings', user.uid), { [item.key]: !userSettings[item.key as keyof UserSettings] })}
                        className={cn("w-12 h-6 rounded-full transition-all relative", userSettings[item.key as keyof UserSettings] ? "bg-emerald-500" : "bg-zinc-700")}
                      >
                        <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-all", userSettings[item.key as keyof UserSettings] ? "left-7" : "left-1")} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <Button className="w-full" onClick={() => setShowSettings(false)}>Done</Button>
            </motion.div>
          </div>
        )}

        {showCreateModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[250] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl max-w-md w-full relative"
            >
              <Button variant="ghost" className="absolute top-4 right-4 p-2" onClick={() => setShowCreateModal(false)}>
                <X className="w-5 h-5" />
              </Button>
              <h2 className="text-2xl font-bold text-white mb-6 font-display">Create a Room</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1.5">Room Name</label>
                  <Input 
                    placeholder="e.g. John's Birthday Bash" 
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1.5">Room Details / Vibe</label>
                  <Input 
                    placeholder="e.g. wedding, birthday, trip..." 
                    value={vibe}
                    onChange={(e) => setVibe(e.target.value)}
                  />
                </div>
                <div className="flex items-center justify-between p-4 bg-zinc-800/30 rounded-2xl mt-4">
                  <span className="text-sm font-medium">Require Approval to Join</span>
                  <button 
                    onClick={() => setRequiresApproval(!requiresApproval)}
                    className={cn("w-12 h-6 rounded-full transition-all relative", requiresApproval ? "bg-emerald-500" : "bg-zinc-700")}
                  >
                    <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-all", requiresApproval ? "left-7" : "left-1")} />
                  </button>
                </div>
                <Button 
                  className="w-full mt-6" 
                  onClick={() => {
                    setShowCreateModal(false);
                    createRoom();
                  }}
                >
                  Create Room
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// --- Host View ---

function HostView({ user, roomCode, onExit, setSelectedProfile, showToast }: { 
  user: any, 
  roomCode: string, 
  onExit: () => void, 
  setSelectedProfile: (p: UserProfile | null) => void,
  showToast: (m: string, t?: 'success' | 'error' | 'info') => void
}) {
  const [room, setRoom] = useState<Room | null>(null);
  const [queue, setQueue] = useState<Track[]>([]);
  const [player, setPlayer] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [activeTab, setActiveTab] = useState<'player' | 'members' | 'requests'>('player');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [requests, setRequests] = useState<RoomJoinRequest[]>([]);
  const [showShareModal, setShowShareModal] = useState(true);

  useEffect(() => {
    if (user) {
      onSnapshot(query(collection(db, 'playlists'), where('uid', '==', user.uid)), (s) => {
        setPlaylists(s.docs.map(d => ({ id: d.id, ...d.data() } as Playlist)));
      });
    }
  }, [user]);

  useEffect(() => {
    const q = query(collection(db, 'rooms'), where('roomCode', '==', roomCode), where('status', '==', 'active'));
    const unsubscribeRoom = onSnapshot(q, (s) => {
      if (!s.empty) {
        setRoom({ id: s.docs[0].id, ...s.docs[0].data() } as Room);
      }
    });

    return () => unsubscribeRoom();
  }, [roomCode]);

  useEffect(() => {
    if (!room) return;
    const unsubscribeQueue = onSnapshot(query(collection(db, 'rooms', room.id, 'queue'), orderBy('sortOrder', 'asc')), (qs) => {
      setQueue(qs.docs.map(d => ({ id: d.id, ...d.data() } as Track)));
    });
    const unsubscribeMembers = onSnapshot(collection(db, 'rooms', room.id, 'members'), (s) => {
      setMembers(s.docs.map(d => ({ id: d.id, ...d.data() } as RoomMember)));
    });
    const unsubscribeRequests = onSnapshot(collection(db, 'rooms', room.id, 'requests'), (s) => {
      setRequests(s.docs.map(d => ({ id: d.id, ...d.data() } as RoomJoinRequest)));
    });
    return () => {
      unsubscribeQueue();
      unsubscribeMembers();
      unsubscribeRequests();
    };
  }, [room?.id]);

  const handleRequest = async (requestId: string, status: 'approved' | 'rejected') => {
    if (!room) return;
    await updateDoc(doc(db, 'rooms', room.id, 'requests', requestId), { status });
    if (status === 'approved') {
      // Notification will be handled by the guest's listener
    }
  };

  const toggleMute = async (memberId: string, isMuted: boolean) => {
    if (!room) return;
    await updateDoc(doc(db, 'rooms', room.id, 'members', memberId), { isMuted: !isMuted });
  };

  const banUser = async (uid: string) => {
    if (!room) return;
    const newBanned = [...(room.bannedUids || []), uid];
    await updateDoc(doc(db, 'rooms', room.id), { bannedUids: newBanned });
    // Remove from members
    await deleteDoc(doc(db, 'rooms', room.id, 'members', uid));
  };

  const currentTrack = queue.find(t => t.status === 'playing') || queue.find(t => t.status === 'queued');

  useEffect(() => {
    if (currentTrack && room && currentTrack.status === 'queued') {
      const updateRoom = async () => {
        await updateDoc(doc(db, 'rooms', room.id), {
          currentTrackId: currentTrack.id,
          isPlaying: true,
        });
        // Mark as playing
        await updateDoc(doc(db, 'rooms', room.id, 'queue', currentTrack.id), {
          status: 'playing'
        });
        // Log to global play history for trending
        await addDoc(collection(db, 'play_history'), {
          youtubeId: currentTrack.youtubeId,
          title: currentTrack.title,
          thumbnail: currentTrack.thumbnail,
          roomId: room.id,
          playedBy: currentTrack.addedByUid,
          createdAt: serverTimestamp()
        });
      };
      updateRoom();
    }
  }, [currentTrack?.id, currentTrack?.status, room?.id]);

  const onStateChange = (event: any) => {
    if (!room) return;
    const isPlaying = event.data === 1;
    updateDoc(doc(db, 'rooms', room.id), { isPlaying });
  };

  const onEnd = async () => {
    if (!room || !currentTrack || currentTrack.status !== 'playing') return;
    try {
      await updateDoc(doc(db, 'rooms', room.id, 'queue', currentTrack.id), {
        status: 'played'
      });
    } catch (e) {
      console.error("Error ending track:", e);
    }
  };

  const toggleAudioOnly = () => {
    if (!room) return;
    updateDoc(doc(db, 'rooms', room.id), { isAudioOnly: !room.isAudioOnly });
  };

  const addToPlaylist = async (playlistId: string, track: Track) => {
    await addDoc(collection(db, 'playlists', playlistId, 'items'), {
      youtubeId: track.youtubeId,
      title: track.title,
      thumbnail: track.thumbnail,
      createdAt: serverTimestamp(),
    });
    showToast('Added to playlist!', 'success');
  };

  const playedTracks = queue.filter(t => t.status === 'played').sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis());

  const collaborators = Array.from(new Set(queue.map(t => t.addedByUid))).map(uid => {
    const track = queue.find(t => t.addedByUid === uid);
    return { uid, displayName: track?.addedBy };
  }).filter(c => c.uid);

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
            <Music className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight">{room?.name}</h2>
            <div className="flex items-center gap-2">
              <p className="text-zinc-500 font-mono text-xs md:text-sm">ROOM: {roomCode}</p>
              <span className="w-1 h-1 bg-zinc-800 rounded-full" />
              <p className="text-zinc-400 text-xs md:text-sm italic line-clamp-1">"{room?.vibe}"</p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">AutoPlay Active</span>
          </div>
          {room && (
            <Button 
              variant="ghost" 
              className={cn("p-2", room.requiresApproval ? "text-emerald-500" : "text-zinc-500")}
              onClick={() => updateDoc(doc(db, 'rooms', room.id), { requiresApproval: !room.requiresApproval })}
              title={room.requiresApproval ? "Approval Required" : "Open Entry"}
            >
              <Shield className="w-5 h-5" />
            </Button>
          )}
          <Button variant="secondary" onClick={() => setShowShareModal(true)}>
            <Share2 className="w-4 h-4" />
            Invite
          </Button>
          <Button variant="danger" onClick={() => setShowDeleteConfirm(true)}>Delete Room</Button>
        </div>
      </header>

      <AnimatePresence>
        {showShareModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[250] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl max-w-sm w-full text-center relative"
            >
              <Button variant="ghost" className="absolute top-4 right-4 p-2" onClick={() => setShowShareModal(false)}>
                <X className="w-5 h-5" />
              </Button>
              <h2 className="text-2xl font-bold text-white mb-2 font-display">Room Created!</h2>
              <p className="text-zinc-400 mb-6">Invite your friends to join the vibe.</p>
              
              <div className="bg-white p-4 rounded-2xl inline-block mb-6">
                <QRCodeSVG value={`${window.location.origin}?room=${roomCode}`} size={200} />
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-xs text-zinc-500 font-bold uppercase mb-2">Room Code</p>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(roomCode);
                      showToast('Room code copied!', 'success');
                    }}
                    className="w-full bg-zinc-800 hover:bg-zinc-700 transition-colors py-3 rounded-xl font-mono text-2xl tracking-widest font-bold text-emerald-400"
                  >
                    {roomCode}
                  </button>
                </div>
                
                <div>
                  <p className="text-xs text-zinc-500 font-bold uppercase mb-2">Invite Link</p>
                  <Button 
                    className="w-full" 
                    onClick={() => {
                      const url = `${window.location.origin}?room=${roomCode}`;
                      navigator.clipboard.writeText(url);
                      showToast('Invite link copied!', 'success');
                    }}
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Copy Invite Link
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[250] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl max-w-md w-full text-center"
            >
              <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2 font-display">Delete Room?</h2>
              <p className="text-zinc-400 mb-8">This will permanently end the session for all members. This action cannot be undone.</p>
              <div className="flex gap-4">
                <Button variant="secondary" className="flex-1" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
                <Button variant="danger" className="flex-1" onClick={async () => {
                  await updateDoc(doc(db, 'rooms', room!.id), { status: 'ended' });
                  onExit();
                }}>Delete</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex gap-1 bg-zinc-900 p-1 rounded-2xl border border-zinc-800 w-full sm:w-fit overflow-x-auto custom-scrollbar">
        {(['player', 'members', 'requests'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 md:px-6 py-2 rounded-xl text-xs md:text-sm font-bold transition-all capitalize relative whitespace-nowrap",
              activeTab === tab ? "bg-emerald-500 text-white" : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            {tab}
            {tab === 'requests' && requests.filter(r => r.status === 'pending').length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-[10px] flex items-center justify-center rounded-full border-2 border-black">
                {requests.filter(r => r.status === 'pending').length}
              </span>
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'player' && (
          <motion.div
            key="player"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            <div className="lg:col-span-2 space-y-6">
              <div className={cn(
                "aspect-video bg-zinc-900 rounded-3xl overflow-hidden border border-zinc-800 shadow-2xl relative group transition-all duration-500",
                room?.isAudioOnly && "aspect-square max-w-sm mx-auto"
              )}>
                {currentTrack ? (
                  <YouTube
                    key={currentTrack.id}
                    videoId={currentTrack.youtubeId}
                    opts={{
                      width: '100%',
                      height: '100%',
                      playerVars: { 
                        autoplay: 1, 
                        controls: 1, 
                        rel: 0, 
                        modestbranding: 1,
                        origin: window.location.origin 
                      },
                    }}
                    onReady={(e) => {
                      setPlayer(e.target);
                      if (room?.isPlaying) {
                        e.target.playVideo();
                      }
                    }}
                    onStateChange={onStateChange}
                    onEnd={onEnd}
                    className={cn("w-full h-full", room?.isAudioOnly && "opacity-0 pointer-events-none absolute")}
                  />
                ) : null}
                
                {room?.isAudioOnly && currentTrack && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center space-y-6">
                    <motion.div 
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ duration: 4, repeat: Infinity }}
                      className="relative"
                    >
                      <img src={currentTrack.thumbnail} alt="" className="w-48 h-48 rounded-full object-cover shadow-2xl border-4 border-emerald-500/20" />
                      <div className="absolute -inset-4 border border-emerald-500/10 rounded-full animate-ping opacity-20" />
                    </motion.div>
                    <div className="space-y-2">
                      <h3 className="text-2xl font-bold line-clamp-2">{currentTrack.title}</h3>
                      <p className="text-zinc-500">Audio Mode Active</p>
                    </div>
                  </div>
                )}

                {!currentTrack && (
                  <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600 gap-4">
                    <Play className="w-12 h-12 opacity-20" />
                    <p>Waiting for guests to add songs...</p>
                  </div>
                )}
              </div>

              {currentTrack && (
                <div className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-3xl space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex-1 min-w-0 w-full">
                      <p className="text-xs text-emerald-500 font-bold uppercase tracking-widest mb-1">
                        {currentTrack.status === 'playing' ? 'Now Playing' : 'Up Next'}
                      </p>
                      <h3 className="text-lg md:text-xl font-bold line-clamp-1">{currentTrack.title}</h3>
                      <p className="text-zinc-500 text-sm">Added by {currentTrack.addedBy}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                      <div className="relative group/playlist">
                        <Button variant="ghost" className="p-3 rounded-full text-zinc-500 hover:text-emerald-500">
                          <Plus className="w-5 h-5" />
                        </Button>
                        <div className="absolute bottom-full right-0 mb-2 w-48 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl opacity-0 invisible group-hover/playlist:opacity-100 group-hover/playlist:visible transition-all p-2 z-50">
                          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest p-2">Add to Playlist</p>
                          {playlists.map(p => (
                            <button 
                              key={p.id} 
                              onClick={() => addToPlaylist(p.id, currentTrack)}
                              className="w-full text-left px-3 py-2 text-xs hover:bg-zinc-800 rounded-lg transition-colors"
                            >
                              {p.name}
                            </button>
                          ))}
                        </div>
                      </div>
                      <Button variant="secondary" className="p-3 rounded-full" onClick={toggleAudioOnly}>
                        <ExternalLink className={cn("w-5 h-5", !room?.isAudioOnly && "text-emerald-500")} />
                      </Button>
                      <Button variant="secondary" className="p-3 rounded-full" onClick={() => player?.pauseVideo()}>
                        <Pause className="w-5 h-5" />
                      </Button>
                      <Button variant="secondary" className="p-3 rounded-full" onClick={() => player?.playVideo()}>
                        <Play className="w-5 h-5" />
                      </Button>
                      <Button variant="secondary" className="p-3 rounded-full" onClick={onEnd}>
                        <SkipForward className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {playedTracks.length > 0 && (
                <div className="space-y-4 pt-4">
                  <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Recently Played</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {playedTracks.slice(0, 4).map(track => (
                      <div key={track.id} className="p-3 bg-zinc-900/20 border border-zinc-800/30 rounded-2xl flex items-center gap-3 opacity-60">
                        <img src={track.thumbnail} alt="" className="w-10 h-10 rounded-lg object-cover grayscale" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium line-clamp-1">{track.title}</p>
                          <p className="text-[10px] text-zinc-600">Played</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Users className="w-5 h-5 text-zinc-500" />
                  Queue ({queue.filter(t => t.status === 'queued').length})
                </h3>
                <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                  {queue.filter(t => t.status === 'queued').map((track, i) => (
                    <motion.div
                      key={track.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-3 bg-zinc-900/30 border border-zinc-800/50 rounded-2xl flex items-center gap-3 group"
                    >
                      <img src={track.thumbnail} alt="" className="w-10 h-10 rounded-lg object-cover" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium line-clamp-1">{track.title}</p>
                        <p className="text-[10px] text-zinc-500">by {track.addedBy}</p>
                      </div>
                      {track.isWildcard && <Crown className="w-3 h-3 text-amber-500" />}
                      <Button variant="ghost" className="p-2 opacity-0 group-hover:opacity-100" onClick={() => deleteDoc(doc(db, 'rooms', room!.id, 'queue', track.id))}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'members' && (
          <motion.div
            key="members"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {members.map(member => (
              <div key={member.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center gap-4 group">
                <img 
                  src={member.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.uid}`} 
                  alt="" 
                  className="w-12 h-12 rounded-xl object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-bold truncate">{member.displayName}</p>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest">
                    {member.uid === room?.hostId ? 'Host' : 'Member'}
                  </p>
                </div>
                {member.uid !== room?.hostId && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button 
                      variant="ghost" 
                      className={cn("p-2", member.isMuted ? "text-red-500" : "text-zinc-500")}
                      onClick={() => toggleMute(member.id, member.isMuted)}
                    >
                      {member.isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </Button>
                    <Button variant="ghost" className="p-2 text-zinc-500 hover:text-red-500" onClick={() => banUser(member.uid)}>
                      <Ban className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </motion.div>
        )}

        {activeTab === 'requests' && (
          <motion.div
            key="requests"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4 max-w-2xl"
          >
            {requests.filter(r => r.status === 'pending').length === 0 ? (
              <div className="text-center py-12 bg-zinc-900/50 rounded-3xl border border-zinc-800 border-dashed">
                <Shield className="w-12 h-12 mx-auto mb-4 text-zinc-800" />
                <p className="text-zinc-500">No pending join requests</p>
              </div>
            ) : (
              requests.filter(r => r.status === 'pending').map(request => (
                <div key={request.id} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <img src={request.photoURL} alt="" className="w-14 h-14 rounded-2xl object-cover" referrerPolicy="no-referrer" />
                    <div>
                      <p className="text-lg font-bold">{request.displayName}</p>
                      <p className="text-sm text-zinc-500">Wants to join the vibe</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button variant="secondary" onClick={() => handleRequest(request.id, 'rejected')}>Reject</Button>
                    <Button onClick={() => handleRequest(request.id, 'approved')}>Approve</Button>
                  </div>
                </div>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Guest View ---

function GuestView({ user, room, queue, onExit, setSelectedProfile, sendNotification, roomMembers, showToast }: { 
  user: any, 
  room: Room, 
  queue: Track[], 
  onExit: () => void, 
  setSelectedProfile: (p: UserProfile | null) => void,
  sendNotification: (toUid: string, type: Notification['type'], message: string, link?: string) => Promise<void>,
  roomMembers: RoomMember[],
  showToast: (m: string, t?: 'success' | 'error' | 'info') => void
}) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasUsedWildcard, setHasUsedWildcard] = useState(false);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);

  useEffect(() => {
    if (user) {
      onSnapshot(query(collection(db, 'playlists'), where('uid', '==', user.uid)), (s) => {
        setPlaylists(s.docs.map(d => ({ id: d.id, ...d.data() } as Playlist)));
      });
    }
  }, [user]);

  const handleSearch = async () => {
    if (!search.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(search)}`);
      const data = await res.json();
      setResults(data);
    } catch (e) {
      console.error(e);
    } finally {
      setSearching(false);
    }
  };

  const addToQueue = async (video: any, isWildcard = false) => {
    const member = roomMembers.find(m => m.uid === user.uid);
    if (member?.isMuted) {
      showToast('You are muted and cannot add songs.', 'error');
      return;
    }

    const trackRef = collection(db, 'rooms', room.id, 'queue');
    const sortOrder = isWildcard ? -Date.now() : Date.now();
    
    await addDoc(trackRef, {
      youtubeId: video.id,
      title: video.title,
      thumbnail: video.thumbnail,
      addedBy: user.displayName,
      addedByUid: user.uid,
      isWildcard,
      sortOrder,
      status: 'queued',
      createdAt: serverTimestamp(),
    });

    if (user.uid !== room.hostId) {
      await sendNotification(room.hostId, 'new_music', `${user.displayName} added a song to your room: ${video.title}`);
    }

    // Increment user's song count
    await updateDoc(doc(db, 'users', user.uid), {
      songsAddedCount: increment(1)
    });

    if (isWildcard) setHasUsedWildcard(true);
    setSearch('');
    setResults([]);
  };

  const addToPlaylist = async (playlistId: string, video: any) => {
    await addDoc(collection(db, 'playlists', playlistId, 'items'), {
      youtubeId: video.id || video.youtubeId,
      title: video.title,
      thumbnail: video.thumbnail,
      createdAt: serverTimestamp(),
    });
    showToast('Added to playlist!', 'success');
  };

  const currentTrack = queue.find(t => t.status === 'playing');

  const collaborators = Array.from(new Set(queue.map(t => t.addedByUid))).map(uid => {
    const track = queue.find(t => t.addedByUid === uid);
    return { uid, displayName: track?.addedBy };
  }).filter(c => c.uid);

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <h2 className="font-bold">Guest Mode</h2>
            <div className="flex items-center gap-2">
              <p className="text-zinc-500 text-xs">Room: {room.roomCode}</p>
              <span className="w-1 h-1 bg-zinc-800 rounded-full" />
              <p className="text-zinc-400 text-xs italic">"{room.vibe}"</p>
            </div>
          </div>
        </div>
        <Button variant="ghost" onClick={onExit}>Leave</Button>
      </header>

      {currentTrack && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-4">
          <div className="relative">
            <img src={currentTrack.thumbnail} alt="" className="w-12 h-12 rounded-xl object-cover" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Now Playing</p>
            <h3 className="font-bold line-clamp-1 text-sm">{currentTrack.title}</h3>
            <p className="text-zinc-500 text-[10px]">Host is playing this on their device</p>
          </div>
          <div className="relative group/playlist">
            <Button variant="ghost" className="p-2 rounded-full text-zinc-500 hover:text-emerald-500">
              <Plus className="w-4 h-4" />
            </Button>
            <div className="absolute bottom-full right-0 mb-2 w-40 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl opacity-0 invisible group-hover/playlist:opacity-100 group-hover/playlist:visible transition-all p-2 z-50">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest p-2">Save to...</p>
              {playlists.map(p => (
                <button 
                  key={p.id} 
                  onClick={() => addToPlaylist(p.id, currentTrack)}
                  className="w-full text-left px-3 py-2 text-[10px] hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Search YouTube..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button onClick={handleSearch} disabled={searching}>
            {searching ? '...' : <Search className="w-5 h-5" />}
          </Button>
        </div>

        <div className="space-y-3">
          {results.map((video) => (
            <motion.div
              key={video.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-2xl flex items-center gap-4"
            >
              <img src={video.thumbnail} alt="" className="w-16 h-10 rounded-lg object-cover" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium line-clamp-2 leading-tight">{video.title}</p>
                <p className="text-[10px] text-zinc-500 mt-1">{video.channelTitle}</p>
              </div>
              <div className="flex flex-col gap-1">
                <Button variant="secondary" className="p-2" onClick={() => addToQueue(video)}>
                  <Plus className="w-4 h-4" />
                </Button>
                <div className="relative group/playlist">
                  <Button variant="ghost" className="p-2 text-zinc-500 hover:text-emerald-500">
                    <LogIn className="w-4 h-4 rotate-90" />
                  </Button>
                  <div className="absolute bottom-full right-0 mb-2 w-40 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl opacity-0 invisible group-hover/playlist:opacity-100 group-hover/playlist:visible transition-all p-2 z-50">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest p-2">Save to...</p>
                    {playlists.map(p => (
                      <button 
                        key={p.id} 
                        onClick={() => addToPlaylist(p.id, video)}
                        className="w-full text-left px-3 py-2 text-[10px] hover:bg-zinc-800 rounded-lg transition-colors"
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-bold">Collaborators</h3>
        <div className="flex flex-wrap gap-2">
          {collaborators.map(c => (
            <button 
              key={c.uid}
              onClick={async () => {
                const docSnap = await getDoc(doc(db, 'users', c.uid as string));
                if (docSnap.exists()) setSelectedProfile({ uid: docSnap.id, ...docSnap.data() } as UserProfile);
              }}
              className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-full text-xs font-bold hover:border-emerald-500/50 transition-colors"
            >
              {c.displayName}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          {queue.filter(t => t.status === 'queued').length === 0 && (
            <p className="text-zinc-600 text-center py-8 italic">Queue is empty. Add some fire! 🔥</p>
          )}
          {queue.filter(t => t.status === 'queued').map((track) => (
            <div key={track.id} className="p-3 bg-zinc-900/20 border border-zinc-800/30 rounded-xl flex items-center gap-3">
              <img src={track.thumbnail} alt="" className="w-10 h-10 rounded-lg object-cover opacity-50" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium line-clamp-1 text-zinc-400">{track.title}</p>
                <p className="text-[10px] text-zinc-600">by {track.addedBy}</p>
              </div>
              {track.isWildcard && <Crown className="w-3 h-3 text-amber-500/50" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
