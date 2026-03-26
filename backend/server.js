import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { google } from 'googleapis';
import { query, initDB } from './db.js';
import { db, auth } from './firebase-admin.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// ─── Middleware: Verify Firebase ID Token ─────────────────────────────────────
async function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = authHeader.split('Bearer ')[1];
  try {
    const decoded = await auth.verifyIdToken(token);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// ─── Middleware: Admin only ───────────────────────────────────────────────────
async function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const result = await query(
      'SELECT role FROM users WHERE firebase_uid = $1',
      [req.user.uid]
    );
    if (!result.rows.length || result.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: admin only' });
    }
    next();
  } catch {
    return res.status(500).json({ error: 'Server error' });
  }
}

// ─── YouTube Search ───────────────────────────────────────────────────────────
const youtube = google.youtube({ version: 'v3', auth: process.env.YOUTUBE_API_KEY });

app.get('/api/search', async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'Query required' });

  try {
    const response = await youtube.search.list({
      part: ['snippet'],
      q,
      type: ['video'],
      videoCategoryId: '10',
      maxResults: 10,
    });

    const results = (response.data.items || []).map((item) => ({
      id: item.id.videoId,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
      channelTitle: item.snippet.channelTitle,
    }));

    res.json(results);
  } catch (err) {
    console.error('YouTube search error:', err.message);
    res.status(500).json({ error: 'Search failed' });
  }
});

// ─── User Routes ──────────────────────────────────────────────────────────────

// Upsert user on login
app.post('/api/users/sync', verifyToken, async (req, res) => {
  const { uid, email, displayName, photoURL } = req.user;
  try {
    const username = email ? email.split('@')[0] : uid.substring(0, 8);
    const result = await query(
      `INSERT INTO users (firebase_uid, email, display_name, username, photo_url, last_login)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (firebase_uid) DO UPDATE
         SET last_login = NOW(),
             display_name = COALESCE(EXCLUDED.display_name, users.display_name),
             photo_url = COALESCE(EXCLUDED.photo_url, users.photo_url)
       RETURNING *`,
      [uid, email || null, displayName || 'Anonymous', username, photoURL || null]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('User sync error:', err.message);
    res.status(500).json({ error: 'User sync failed' });
  }
});

// Update user profile
app.patch('/api/users/profile', verifyToken, async (req, res) => {
  const { displayName, username, photoURL, bio } = req.body;
  try {
    const result = await query(
      `UPDATE users SET
        display_name = COALESCE($1, display_name),
        username = COALESCE($2, username),
        photo_url = COALESCE($3, photo_url)
       WHERE firebase_uid = $4 RETURNING *`,
      [displayName || null, username || null, photoURL || null, req.user.uid]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Profile update error:', err.message);
    res.status(500).json({ error: 'Update failed' });
  }
});

// Log play to PostgreSQL
app.post('/api/play-history', verifyToken, async (req, res) => {
  const { youtubeId, title, thumbnail, roomCode } = req.body;
  try {
    await query(
      `INSERT INTO play_history (youtube_id, title, thumbnail, room_code, played_by_uid)
       VALUES ($1, $2, $3, $4, $5)`,
      [youtubeId, title, thumbnail, roomCode, req.user.uid]
    );

    // Also upsert track metadata
    await query(
      `INSERT INTO tracks (youtube_id, title, thumbnail)
       VALUES ($1, $2, $3)
       ON CONFLICT (youtube_id) DO NOTHING`,
      [youtubeId, title, thumbnail]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error('Play history error:', err.message);
    res.status(500).json({ error: 'Failed to log play' });
  }
});

// Get trending songs from PostgreSQL
app.get('/api/trending', async (req, res) => {
  const { period = 'week', order = 'most', limit = 10 } = req.query;

  let interval;
  if (period === 'day') interval = '1 day';
  else if (period === 'month') interval = '30 days';
  else interval = '7 days';

  const orderDir = order === 'least' ? 'ASC' : 'DESC';

  try {
    const result = await query(
      `SELECT youtube_id, title, thumbnail, COUNT(*) as play_count
       FROM play_history
       WHERE played_at >= NOW() - INTERVAL '${interval}'
       GROUP BY youtube_id, title, thumbnail
       ORDER BY play_count ${orderDir}
       LIMIT $1`,
      [Math.min(parseInt(limit), 50)]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Trending error:', err.message);
    res.status(500).json({ error: 'Failed to fetch trending' });
  }
});

// ─── Admin Routes ─────────────────────────────────────────────────────────────

app.get('/api/admin/stats', verifyToken, requireAdmin, async (req, res) => {
  try {
    const [usersRes, roomsRes, dailyRes, weeklyRes, monthlyRes] = await Promise.all([
      query('SELECT COUNT(*) FROM users'),
      query('SELECT COUNT(*) FROM rooms'),
      query(`SELECT COUNT(*) FROM play_history WHERE played_at >= NOW() - INTERVAL '1 day'`),
      query(`SELECT COUNT(*) FROM play_history WHERE played_at >= NOW() - INTERVAL '7 days'`),
      query(`SELECT COUNT(*) FROM play_history WHERE played_at >= NOW() - INTERVAL '30 days'`),
    ]);

    res.json({
      totalUsers: parseInt(usersRes.rows[0].count),
      totalRooms: parseInt(roomsRes.rows[0].count),
      dailySongs: parseInt(dailyRes.rows[0].count),
      weeklySongs: parseInt(weeklyRes.rows[0].count),
      monthlySongs: parseInt(monthlyRes.rows[0].count),
    });
  } catch (err) {
    console.error('Admin stats error:', err.message);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

app.get('/api/admin/users', verifyToken, requireAdmin, async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM users ORDER BY created_at DESC LIMIT 100'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.patch('/api/admin/users/:uid/ban', verifyToken, requireAdmin, async (req, res) => {
  const { uid } = req.params;
  const { banned } = req.body;
  try {
    await query('UPDATE users SET is_banned = $1 WHERE firebase_uid = $2', [banned, uid]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

app.get('/api/admin/rooms', verifyToken, requireAdmin, async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM rooms ORDER BY created_at DESC LIMIT 100'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch rooms' });
  }
});

app.patch('/api/admin/rooms/:id/status', verifyToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    await query('UPDATE rooms SET status = $1 WHERE id = $2', [status, id]);
    // Also update in RTDB if active/ended change
    const roomRes = await query('SELECT room_code FROM rooms WHERE id = $1', [id]);
    if (roomRes.rows.length && db) {
      const ref = db.ref(`roomCodes/${roomRes.rows[0].room_code}`);
      const snap = await ref.once('value');
      if (snap.val()) {
        await db.ref(`rooms/${snap.val()}/status`).set(status);
      }
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update room' });
  }
});

// Get/save ads code
app.get('/api/admin/ads', verifyToken, requireAdmin, async (req, res) => {
  try {
    const snap = await db.ref('settings/ads').once('value');
    res.json({ code: snap.val()?.code || '' });
  } catch {
    res.json({ code: '' });
  }
});

app.post('/api/admin/ads', verifyToken, requireAdmin, async (req, res) => {
  const { code } = req.body;
  try {
    await db.ref('settings/ads').set({ code });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save ads code' });
  }
});

// ─── Room creation (log to PostgreSQL) ───────────────────────────────────────
app.post('/api/rooms', verifyToken, async (req, res) => {
  const { roomCode, name, vibe, requiresApproval } = req.body;
  try {
    await query(
      `INSERT INTO rooms (room_code, host_firebase_uid, name, vibe, requires_approval)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (room_code) DO NOTHING`,
      [roomCode, req.user.uid, name, vibe || 'General Mix', requiresApproval || false]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('Room log error:', err.message);
    res.status(500).json({ error: 'Failed to log room' });
  }
});

// End room (log ended_at)
app.patch('/api/rooms/:code/end', verifyToken, async (req, res) => {
  try {
    await query(
      `UPDATE rooms SET status = 'ended', ended_at = NOW() WHERE room_code = $1`,
      [req.params.code]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to end room' });
  }
});

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
async function start() {
  await initDB();
  app.listen(PORT, () => {
    console.log(`🚀 Moozik backend running on http://localhost:${PORT}`);
  });
}

start();
