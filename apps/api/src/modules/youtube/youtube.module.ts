import { Module } from '@nestjs/common';
import { YouTubeController } from './youtube.controller';

@Module({
  controllers: [YouTubeController],
})
export class YouTubeModule {}
