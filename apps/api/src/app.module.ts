import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RoomsModule } from './modules/rooms/rooms.module';
import { YouTubeModule } from './modules/youtube/youtube.module';
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), RedisModule, RoomsModule, YouTubeModule],
})
export class AppModule {}
