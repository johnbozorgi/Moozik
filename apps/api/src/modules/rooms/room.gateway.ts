import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import {
  AddQueueItemPayloadSchema,
  HostSyncPayloadSchema,
  LatencyPingPayloadSchema,
  RoomJoinPayloadSchema,
} from '@roombeat/shared/socket';
import type { ClientToServerEvents, ServerToClientEvents } from '@roombeat/shared/socket';
import { RoomQueueService } from './room-queue.service';
import { RoomSyncService } from './room-sync.service';

type RoomSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

@WebSocketGateway({
  cors: {
    origin: true,
    credentials: true,
  },
})
export class RoomGateway implements OnGatewayConnection {
  @WebSocketServer()
  server!: Server<ClientToServerEvents, ServerToClientEvents>;

  constructor(
    private readonly syncService: RoomSyncService,
    private readonly queueService: RoomQueueService,
  ) {}

  handleConnection(client: RoomSocket) {
    client.data.user = {
      id: client.handshake.auth?.userId ?? client.id,
      displayName: client.handshake.auth?.displayName ?? 'Guest',
    };
  }

  @SubscribeMessage('room:join')
  async joinRoom(@ConnectedSocket() client: RoomSocket, @MessageBody() body: unknown) {
    const payload = RoomJoinPayloadSchema.parse(body);
    await client.join(payload.roomId);

    client.emit('room:state', {
      roomId: payload.roomId,
      sync: await this.syncService.getLatestSync(payload.roomId),
      queue: await this.queueService.snapshot(payload.roomId),
      activeUserCount: this.server.sockets.adapter.rooms.get(payload.roomId)?.size ?? 1,
    });
  }

  @SubscribeMessage('host:sync')
  async hostSync(@MessageBody() body: unknown) {
    const payload = HostSyncPayloadSchema.parse(body);
    const sync = await this.syncService.stampHostSync(payload, 'heartbeat');
    this.server.to(payload.roomId).emit('sync:broadcast', sync);
  }

  @SubscribeMessage('host:seek')
  async hostSeek(@MessageBody() body: unknown) {
    const payload = HostSyncPayloadSchema.parse(body);
    const sync = await this.syncService.stampHostSync(payload, 'seek');
    this.server.to(payload.roomId).emit('sync:force-correction', sync);
  }

  @SubscribeMessage('host:change-track')
  async hostChangeTrack(@MessageBody() body: unknown) {
    const payload = HostSyncPayloadSchema.parse(body);
    const sync = await this.syncService.stampHostSync(payload, 'track_change');
    this.server.to(payload.roomId).emit('sync:force-correction', sync);
  }

  @SubscribeMessage('queue:add')
  async addQueueItem(@ConnectedSocket() client: RoomSocket, @MessageBody() body: unknown) {
    const payload = AddQueueItemPayloadSchema.parse(body);
    const snapshot = await this.queueService.addItem(payload, {
      id: client.data.user.id,
      displayName: client.data.user.displayName,
    });
    this.server.to(payload.roomId).emit('queue:updated', snapshot);
  }

  @SubscribeMessage('latency:ping')
  latencyPing(@ConnectedSocket() client: RoomSocket, @MessageBody() body: unknown) {
    const payload = LatencyPingPayloadSchema.parse(body);
    const serverReceivedAtMs = Date.now();

    client.emit('latency:pong', {
      clientSentAtMs: payload.clientSentAtMs,
      serverReceivedAtMs,
      serverSentAtMs: Date.now(),
    });
  }
}
