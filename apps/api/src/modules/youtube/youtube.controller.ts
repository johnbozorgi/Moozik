import { Controller, Get, Query } from '@nestjs/common';
import { searchYouTubeVideos } from '@roombeat/youtube';

@Controller('youtube')
export class YouTubeController {
  @Get('search')
  async search(@Query('q') query: string) {
    if (!process.env.YOUTUBE_API_KEY) {
      throw new Error('YOUTUBE_API_KEY is not configured');
    }

    return searchYouTubeVideos({
      apiKey: process.env.YOUTUBE_API_KEY,
      query,
      maxResults: 10,
    });
  }
}
