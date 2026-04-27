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
  score: z.number().int().default(0),
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
  reaction: z.enum(['fire', 'heart', 'bass', 'clap', 'rewind']),
});
export type SoundReactionPayload = z.infer<typeof SoundReactionPayloadSchema>;

export const LatencyPingPayloadSchema = z.object({
  clientSentAtMs: z.number().int(),
});
export type LatencyPingPayload = z.infer<typeof LatencyPingPayloadSchema>;

export const LatencyPongPayloadSchema = LatencyPingPayloadSchema.extend({
  serverReceivedAtMs: z.number().int(),
  serverSentAtMs: z.number().int(),
});
export type LatencyPongPayload = z.infer<typeof LatencyPongPayloadSchema>;
