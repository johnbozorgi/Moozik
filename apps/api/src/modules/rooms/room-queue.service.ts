import { Injectable } from '@nestjs/common';
import type { AddQueueItemPayload, QueueItem, QueueSnapshot } from '@roombeat/shared/socket';
import { randomUUID } from 'node:crypto';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class RoomQueueService {
  constructor(private readonly redis: RedisService) {}

  async addItem(
    payload: AddQueueItemPayload,
    user: { id: string; displayName: string },
  ): Promise<QueueSnapshot> {
    const item: QueueItem = {
      id: randomUUID(),
      roomId: payload.roomId,
      videoId: payload.videoId,
      title: payload.title,
      channelTitle: payload.channelTitle,
      thumbnailUrl: payload.thumbnailUrl,
      durationSec: payload.durationSec,
      addedByUserId: user.id,
      addedByDisplayName: user.displayName,
      score: 0,
      createdAtMs: Date.now(),
    };

    const queueKey = this.queueKey(payload.roomId);
    const itemKey = this.itemKey(payload.roomId, item.id);

    await this.redis.client
      .multi()
      .hset(itemKey, this.serializeQueueItem(item))
      .zadd(queueKey, item.createdAtMs, item.id)
      .expire(queueKey, 60 * 60 * 24)
      .expire(itemKey, 60 * 60 * 24)
      .exec();

    return this.snapshot(payload.roomId);
  }

  async snapshot(roomId: string): Promise<QueueSnapshot> {
    const ids = await this.redis.client.zrange(this.queueKey(roomId), 0, -1);
    const items = (
      await Promise.all(ids.map((id) => this.redis.client.hgetall(this.itemKey(roomId, id))))
    ).map((raw) => this.deserializeQueueItem(raw));

    return {
      roomId,
      items,
      updatedAtMs: Date.now(),
    };
  }

  private queueKey(roomId: string) {
    return `room:${roomId}:queue`;
  }

  private itemKey(roomId: string, itemId: string) {
    return `room:${roomId}:queue:item:${itemId}`;
  }

  private serializeQueueItem(item: QueueItem): Record<string, string> {
    return {
      id: item.id,
      roomId: item.roomId,
      videoId: item.videoId,
      title: item.title,
      channelTitle: item.channelTitle,
      thumbnailUrl: item.thumbnailUrl,
      durationSec: item.durationSec ? String(item.durationSec) : '',
      addedByUserId: item.addedByUserId,
      addedByDisplayName: item.addedByDisplayName,
      score: String(item.score),
      createdAtMs: String(item.createdAtMs),
    };
  }

  private deserializeQueueItem(raw: Record<string, string>): QueueItem {
    return {
      id: this.required(raw, 'id'),
      roomId: this.required(raw, 'roomId'),
      videoId: this.required(raw, 'videoId'),
      title: this.required(raw, 'title'),
      channelTitle: this.required(raw, 'channelTitle'),
      thumbnailUrl: this.required(raw, 'thumbnailUrl'),
      durationSec: raw.durationSec ? Number(raw.durationSec) : undefined,
      addedByUserId: this.required(raw, 'addedByUserId'),
      addedByDisplayName: this.required(raw, 'addedByDisplayName'),
      score: Number(raw.score ?? 0),
      createdAtMs: Number(raw.createdAtMs),
    };
  }

  private required(raw: Record<string, string>, key: string): string {
    const value = raw[key];
    if (!value) {
      throw new Error(`Queue item is missing required field: ${key}`);
    }

    return value;
  }
}
