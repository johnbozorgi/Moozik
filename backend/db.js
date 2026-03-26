import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  console.error('PostgreSQL pool error:', err);
});

export async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  if (process.env.NODE_ENV !== 'production') {
    console.log('query', { text, duration, rows: res.rowCount });
  }
  return res;
}

export async function getClient() {
  const client = await pool.connect();
  const originalQuery = client.query.bind(client);
  const release = client.release.bind(client);
  client.release = () => {
    release();
  };
  return client;
}

// Initialize database tables
export async function initDB() {
  try {
    await pool.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        firebase_uid VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE,
        display_name VARCHAR(255),
        username VARCHAR(255) UNIQUE,
        photo_url TEXT,
        role VARCHAR(50) DEFAULT 'user',
        is_banned BOOLEAN DEFAULT false,
        rating NUMERIC(3,2) DEFAULT 0,
        rating_count INTEGER DEFAULT 0,
        songs_added_count INTEGER DEFAULT 0,
        rooms_joined_count INTEGER DEFAULT 0,
        followers_count INTEGER DEFAULT 0,
        following_count INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        last_login TIMESTAMPTZ
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS rooms (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        room_code VARCHAR(10) UNIQUE NOT NULL,
        host_firebase_uid VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        vibe VARCHAR(255),
        status VARCHAR(50) DEFAULT 'active',
        requires_approval BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        ended_at TIMESTAMPTZ
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS tracks (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        youtube_id VARCHAR(255) UNIQUE NOT NULL,
        title VARCHAR(255) NOT NULL,
        thumbnail TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS play_history (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        youtube_id VARCHAR(255) NOT NULL,
        title VARCHAR(255),
        thumbnail TEXT,
        room_code VARCHAR(10),
        played_by_uid VARCHAR(255),
        played_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid);
      CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status);
      CREATE INDEX IF NOT EXISTS idx_play_history_played_at ON play_history(played_at DESC);
      CREATE INDEX IF NOT EXISTS idx_play_history_youtube_id ON play_history(youtube_id);
    `);

    console.log('✅ Database tables initialized');
  } catch (err) {
    console.error('❌ Error initializing database:', err.message);
  }
}

export default pool;
