import { Injectable } from '@nestjs/common';
import type { HostSyncPayload, ServerSyncPayload } from '@roombeat/shared/socket';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class RoomSyncService {
  constructor(private readonly redis: RedisService) {}

  async stampHostSync(
    payload: HostSyncPayload,
    reason: ServerSyncPayload['reason'] = 'heartbeat',
  ): Promise<ServerSyncPayload> {
    const sequence = await this.redis.client.incr(this.sequenceKey(payload.roomId));

    const sync: ServerSyncPayload = {
      roomId: payload.roomId,
      videoId: payload.videoId,
      status: payload.status,
      positionSec: payload.positionSec,
      playbackRate: payload.playbackRate,
      serverTimestampMs: Date.now(),
      sequence,
      reason,
    };

    await this.redis.client.set(this.syncKey(payload.roomId), JSON.stringify(sync), 'EX', 60 * 60 * 12);
    return sync;
  }

  async getLatestSync(roomId: string): Promise<ServerSyncPayload | null> {
    const raw = await this.redis.client.get(this.syncKey(roomId));
    return raw ? (JSON.parse(raw) as ServerSyncPayload) : null;
  }

  private syncKey(roomId: string) {
    return `room:${roomId}:sync`;
  }

  private sequenceKey(roomId: string) {
    return `room:${roomId}:sync:sequence`;
  }
}
