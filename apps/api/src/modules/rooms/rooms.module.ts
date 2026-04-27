import { Module } from '@nestjs/common';
import { RoomGateway } from './room.gateway';
import { RoomSyncService } from './room-sync.service';
import { RoomQueueService } from './room-queue.service';

@Module({
  providers: [RoomGateway, RoomSyncService, RoomQueueService],
  exports: [RoomSyncService, RoomQueueService],
})
export class RoomsModule {}
