import type {
  AddQueueItemPayload,
  ChatMessagePayload,
  HostSyncPayload,
  LatencyPingPayload,
  LatencyPongPayload,
  QueueSnapshot,
  QueueVotePayload,
  RoomJoinPayload,
  ServerSyncPayload,
  SoundReactionPayload,
} from './schemas.js';

export type ClientToServerEvents = {
  'room:join': (payload: RoomJoinPayload) => void;
  'room:leave': (payload: { roomId: string }) => void;
  'host:sync': (payload: HostSyncPayload) => void;
  'host:seek': (payload: HostSyncPayload) => void;
  'host:change-track': (payload: HostSyncPayload) => void;
  'queue:add': (payload: AddQueueItemPayload) => void;
  'queue:vote': (payload: QueueVotePayload) => void;
  'chat:message': (payload: ChatMessagePayload) => void;
  'reaction:send': (payload: SoundReactionPayload) => void;
  'latency:ping': (payload: LatencyPingPayload) => void;
};

export type ServerToClientEvents = {
  'room:state': (payload: {
    roomId: string;
    sync: ServerSyncPayload | null;
    queue: QueueSnapshot;
    activeUserCount: number;
  }) => void;
  'sync:broadcast': (payload: ServerSyncPayload) => void;
  'sync:force-correction': (payload: ServerSyncPayload) => void;
  'queue:updated': (payload: QueueSnapshot) => void;
  'chat:message': (payload: ChatMessagePayload & { id: string; userId: string; sentAtMs: number }) => void;
  'reaction:broadcast': (payload: SoundReactionPayload & { id: string; userId: string; sentAtMs: number }) => void;
  'latency:pong': (payload: LatencyPongPayload) => void;
  'error:event': (payload: { code: string; message: string }) => void;
};
