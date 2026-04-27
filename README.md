# RoomBeat

RoomBeat is a social live-streaming platform for synchronized YouTube music and video rooms.

This repository is evolving from the original Moozik prototype into the RoomBeat monorepo architecture.

## MVP Stack

- React Native Expo mobile app.
- Next.js App Router web app with SSR room pages.
- NestJS API with Socket.io real-time gateway.
- PostgreSQL and Prisma for durable data.
- Redis for active queue, playback state, presence, chat buffers, and future Socket.io scaling.

## Getting Started

```bash
corepack pnpm install
docker compose up -d postgres redis
corepack pnpm --filter @roombeat/database db:generate
corepack pnpm dev
```

Set `YOUTUBE_API_KEY` in `.env` before using YouTube search.

## Important Packages

- `@roombeat/shared`: socket schemas, event types, and sync math.
- `@roombeat/database`: Prisma schema and generated database client.
- `@roombeat/youtube`: YouTube Data API helpers.

## Phase 1 Focus

The first phase is the core room loop: auth, room creation, YouTube search, Redis queue, Socket.io host sync, and mobile playback compensation.
