import { Controller, Get, Query } from '@nestjs/common';
import {
  getYouTubeVideoMetadata,
  listYouTubePlaylistItems,
  searchYouTubeVideos,
  type YouTubeSearchType,
} from '@roombeat/youtube';

@Controller('youtube')
export class YouTubeController {
  @Get('search')
  async search(@Query('q') query: string, @Query('type') type?: YouTubeSearchType) {
    if (!process.env.YOUTUBE_API_KEY) {
      throw new Error('YOUTUBE_API_KEY is not configured');
    }

    return searchYouTubeVideos({
      apiKey: process.env.YOUTUBE_API_KEY,
      query,
      type: type === 'playlist' ? 'playlist' : 'video',
      maxResults: 10,
    });
  }

  @Get('videos')
  async videos(@Query('ids') ids: string) {
    if (!process.env.YOUTUBE_API_KEY) {
      throw new Error('YOUTUBE_API_KEY is not configured');
    }

    return getYouTubeVideoMetadata({
      apiKey: process.env.YOUTUBE_API_KEY,
      videoIds: ids.split(',').map((id) => id.trim()).filter(Boolean),
    });
  }

  @Get('playlist-items')
  async playlistItems(@Query('playlistId') playlistId: string) {
    if (!process.env.YOUTUBE_API_KEY) {
      throw new Error('YOUTUBE_API_KEY is not configured');
    }

    return listYouTubePlaylistItems({
      apiKey: process.env.YOUTUBE_API_KEY,
      playlistId,
      maxResults: 25,
    });
  }
}
