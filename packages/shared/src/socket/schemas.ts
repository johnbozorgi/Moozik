import { z } from 'zod';

export const PlaybackStatusSchema = z.enum(['idle', 'loading', 'playing', 'paused', 'ended']);
export type PlaybackStatus = z.infer<typeof PlaybackStatusSchema>;

export const QueueItemSchema = z.object({
  id: z.string(),
  roomId: z.string(),
  videoId: z.string(),
  title: z.string(),
  channelTitle: z.string(),
  thumbnailUrl: z.string().url(),
  durationSec: z.number().int().positive().optional(),
  addedByUserId: z.string(),
  addedByDisplayName: z.string(),
  addedByAvatarUrl: z.string().url().optional(),
  score: z.number().int().default(0),
  upvotes: z.number().int().nonnegative().default(0),
  downvotes: z.number().int().nonnegative().default(0),
  createdAtMs: z.number().int(),
});
export type QueueItem = z.infer<typeof QueueItemSchema>;

export const HostSyncPayloadSchema = z.object({
  roomId: z.string(),
  videoId: z.string(),
  status: PlaybackStatusSchema,
  positionSec: z.number().min(0),
  playbackRate: z.number().positive().default(1),
  hostClientSentAtMs: z.number().int(),
});
export type HostSyncPayload = z.infer<typeof HostSyncPayloadSchema>;

export const ServerSyncPayloadSchema = HostSyncPayloadSchema.omit({
  hostClientSentAtMs: true,
}).extend({
  serverTimestampMs: z.number().int(),
  sequence: z.number().int().nonnegative(),
  reason: z.enum(['heartbeat', 'join_snapshot', 'play', 'pause', 'seek', 'track_change']),
});
export type ServerSyncPayload = z.infer<typeof ServerSyncPayloadSchema>;

export const AddQueueItemPayloadSchema = z.object({
  roomId: z.string(),
  videoId: z.string(),
  title: z.string(),
  channelTitle: z.string(),
  thumbnailUrl: z.string().url(),
  durationSec: z.number().int().positive().optional(),
});
export type AddQueueItemPayload = z.infer<typeof AddQueueItemPayloadSchema>;

export const QueueVotePayloadSchema = z.object({
  roomId: z.string(),
  queueItemId: z.string(),
  direction: z.enum(['up', 'down']),
});
export type QueueVotePayload = z.infer<typeof QueueVotePayloadSchema>;

export const HostRoomSettingsSchema = z.object({
  roomId: z.string(),
  queueRights: z.enum(['everyone', 'friends', 'cohosts', 'host']),
  djStyle: z.enum(['manual', 'auto_crossfade', 'radio']),
  soundReactionsEnabled: z.boolean(),
  coHostUserIds: z.array(z.string()),
});
export type HostRoomSettings = z.infer<typeof HostRoomSettingsSchema>;

export const LyricsJumpSuggestionSchema = z.object({
  roomId: z.string(),
  videoId: z.string(),
  suggestedByUserId: z.string(),
  lyricLine: z.string().min(1).max(240),
  positionSec: z.number().min(0),
});
export type LyricsJumpSuggestion = z.infer<typeof LyricsJumpSuggestionSchema>;

export const QueueSnapshotSchema = z.object({
  roomId: z.string(),
  items: z.array(QueueItemSchema),
  updatedAtMs: z.number().int(),
});
export type QueueSnapshot = z.infer<typeof QueueSnapshotSchema>;

export const RoomJoinPayloadSchema = z.object({
  roomId: z.string(),
  userId: z.string(),
});
export type RoomJoinPayload = z.infer<typeof RoomJoinPayloadSchema>;

export const ChatMessagePayloadSchema = z.object({
  roomId: z.string(),
  body: z.string().min(1).max(500),
});
export type ChatMessagePayload = z.infer<typeof ChatMessagePayloadSchema>;

export const SoundReactionPayloadSchema = z.object({
  roomId: z.string(),
  reaction: z.enum(['fire', 'heart', 'bass', 'clap', 'rewind', 'spark']),
  soundEnabled: z.boolean().default(true),
});
export type SoundReactionPayload = z.infer<typeof SoundReactionPayloadSchema>;

export const UserMusicDnaSchema = z.object({
  userId: z.string(),
  genres: z.array(
    z.object({
      name: z.string(),
      weight: z.number().min(0).max(1),
    }),
  ),
  hostLevel: z.number().int().nonnegative(),
  badges: z.array(z.string()),
});
export type UserMusicDna = z.infer<typeof UserMusicDnaSchema>;

export const LatencyPingPayloadSchema = z.object({
  clientSentAtMs: z.number().int(),
});
export type LatencyPingPayload = z.infer<typeof LatencyPingPayloadSchema>;

export const LatencyPongPayloadSchema = LatencyPingPayloadSchema.extend({
  serverReceivedAtMs: z.number().int(),
  serverSentAtMs: z.number().int(),
});
export type LatencyPongPayload = z.infer<typeof LatencyPongPayloadSchema>;
