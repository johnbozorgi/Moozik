# RoomBeat Architecture

RoomBeat is a synchronized social watching platform built around Music Rooms. The MVP uses YouTube Data API v3 for search and the official YouTube iframe players on mobile and web, avoiding media storage and bandwidth cost while keeping playback copyright-compliant.

## Surfaces

- `apps/mobile`: primary React Native Expo room experience.
- `apps/web`: Next.js App Router app for SEO, discovery, and quick room access.
- `apps/api`: NestJS REST API plus Socket.io real-time gateway.
- `apps/worker`: background jobs for room cleanup, gamification, and future recommendation workflows.

## Data Split

- PostgreSQL stores durable entities: users, rooms, sessions, badges, friends, saved playlists, and room history.
- Redis stores volatile room state: active queue, playback sync state, presence, typing indicators, and recent chat/reactions.

## Real-Time Authority

The host controls playback, but the server is the synchronization authority. Host clients send playback observations. The server stamps each state with server time, sequence number, and room version before broadcasting to joiners. Joiners estimate clock offset and round-trip latency to calculate the target playback second.

## Deployment Shape

The default local and early production topology is:

- Next.js web app
- Expo mobile build
- NestJS API
- Redis
- PostgreSQL
- Worker process
- Nginx reverse proxy in production

The Socket.io Redis adapter lets multiple API replicas coordinate room broadcasts when traffic grows.
