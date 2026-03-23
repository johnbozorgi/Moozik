-- PostgreSQL Database Structure for Ridio
-- This schema defines the persistent storage layer for user profiles, rooms, history, and logs.
-- Real-time queue and requests will continue to be handled by Firebase Realtime Database/Firestore.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table
-- Stores persistent user profiles, roles, and settings.
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    firebase_uid VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(255),
    username VARCHAR(255) UNIQUE,
    photo_url TEXT,
    role VARCHAR(50) DEFAULT 'user', -- 'user', 'admin'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE
);

-- Rooms Table
-- Stores historical and active room metadata.
CREATE TABLE rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_code VARCHAR(10) UNIQUE NOT NULL,
    host_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    vibe VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'ended'
    requires_approval BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP WITH TIME ZONE
);

-- Room Members Table
-- Tracks who joined which room and when.
CREATE TABLE room_members (
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    left_at TIMESTAMP WITH TIME ZONE,
    is_muted BOOLEAN DEFAULT false,
    PRIMARY KEY (room_id, user_id)
);

-- Tracks Table
-- Stores metadata for YouTube tracks played across the platform.
CREATE TABLE tracks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    youtube_id VARCHAR(255) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    thumbnail TEXT,
    duration_seconds INTEGER
);

-- Play History Table
-- Logs every track played in every room for analytics and recommendations.
CREATE TABLE play_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    track_id UUID REFERENCES tracks(id) ON DELETE CASCADE,
    played_by UUID REFERENCES users(id) ON DELETE SET NULL,
    played_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- System Logs Table
-- For Admin Dashboard to monitor platform health and activity.
CREATE TABLE system_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    level VARCHAR(50) NOT NULL, -- 'info', 'warning', 'error'
    event_type VARCHAR(255) NOT NULL,
    message TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_users_firebase_uid ON users(firebase_uid);
CREATE INDEX idx_rooms_host_id ON rooms(host_id);
CREATE INDEX idx_rooms_status ON rooms(status);
CREATE INDEX idx_play_history_room_id ON play_history(room_id);
CREATE INDEX idx_play_history_played_by ON play_history(played_by);
CREATE INDEX idx_system_logs_created_at ON system_logs(created_at DESC);
