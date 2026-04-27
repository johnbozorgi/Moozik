export type YouTubeSearchResult = {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
};

export type YouTubeSearchType = 'video' | 'playlist';

export type YouTubeVideoMetadata = YouTubeSearchResult & {
  durationIso: string;
  definition: 'hd' | 'sd';
};

export async function searchYouTubeVideos(input: {
  apiKey: string;
  query: string;
  maxResults?: number;
  type?: YouTubeSearchType;
}): Promise<YouTubeSearchResult[]> {
  const url = new URL('https://www.googleapis.com/youtube/v3/search');
  url.searchParams.set('part', 'snippet');
  url.searchParams.set('type', input.type ?? 'video');
  if ((input.type ?? 'video') === 'video') {
    url.searchParams.set('videoEmbeddable', 'true');
  }
  url.searchParams.set('q', input.query);
  url.searchParams.set('maxResults', String(input.maxResults ?? 10));
  url.searchParams.set('key', input.apiKey);

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`YouTube search failed with ${response.status}`);
  }

  const payload = (await response.json()) as {
    items?: Array<{
      id?: { videoId?: string };
      snippet?: {
        title?: string;
        channelTitle?: string;
        thumbnails?: { high?: { url?: string }; medium?: { url?: string } };
      };
    }>;
  };

  return (payload.items ?? [])
    .map((item) => ({
      videoId: item.id?.videoId ?? '',
      title: item.snippet?.title ?? 'Untitled video',
      channelTitle: item.snippet?.channelTitle ?? 'Unknown channel',
      thumbnailUrl: item.snippet?.thumbnails?.high?.url ?? item.snippet?.thumbnails?.medium?.url ?? '',
    }))
    .filter((item) => item.videoId && item.thumbnailUrl);
}

export async function getYouTubeVideoMetadata(input: {
  apiKey: string;
  videoIds: string[];
}): Promise<YouTubeVideoMetadata[]> {
  if (input.videoIds.length === 0) {
    return [];
  }

  const url = new URL('https://www.googleapis.com/youtube/v3/videos');
  url.searchParams.set('part', 'snippet,contentDetails');
  url.searchParams.set('id', input.videoIds.join(','));
  url.searchParams.set('key', input.apiKey);

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`YouTube metadata lookup failed with ${response.status}`);
  }

  const payload = (await response.json()) as {
    items?: Array<{
      id?: string;
      snippet?: {
        title?: string;
        channelTitle?: string;
        thumbnails?: { maxres?: { url?: string }; high?: { url?: string }; medium?: { url?: string } };
      };
      contentDetails?: { duration?: string; definition?: 'hd' | 'sd' };
    }>;
  };

  return (payload.items ?? [])
    .map((item) => ({
      videoId: item.id ?? '',
      title: item.snippet?.title ?? 'Untitled video',
      channelTitle: item.snippet?.channelTitle ?? 'Unknown channel',
      thumbnailUrl:
        item.snippet?.thumbnails?.maxres?.url ??
        item.snippet?.thumbnails?.high?.url ??
        item.snippet?.thumbnails?.medium?.url ??
        '',
      durationIso: item.contentDetails?.duration ?? 'PT0S',
      definition: item.contentDetails?.definition ?? 'sd',
    }))
    .filter((item) => item.videoId && item.thumbnailUrl);
}

export async function listYouTubePlaylistItems(input: {
  apiKey: string;
  playlistId: string;
  maxResults?: number;
}): Promise<YouTubeSearchResult[]> {
  const url = new URL('https://www.googleapis.com/youtube/v3/playlistItems');
  url.searchParams.set('part', 'snippet,contentDetails');
  url.searchParams.set('playlistId', input.playlistId);
  url.searchParams.set('maxResults', String(input.maxResults ?? 25));
  url.searchParams.set('key', input.apiKey);

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`YouTube playlist import failed with ${response.status}`);
  }

  const payload = (await response.json()) as {
    items?: Array<{
      contentDetails?: { videoId?: string };
      snippet?: {
        title?: string;
        channelTitle?: string;
        thumbnails?: { high?: { url?: string }; medium?: { url?: string } };
      };
    }>;
  };

  return (payload.items ?? [])
    .map((item) => ({
      videoId: item.contentDetails?.videoId ?? '',
      title: item.snippet?.title ?? 'Untitled video',
      channelTitle: item.snippet?.channelTitle ?? 'Unknown channel',
      thumbnailUrl: item.snippet?.thumbnails?.high?.url ?? item.snippet?.thumbnails?.medium?.url ?? '',
    }))
    .filter((item) => item.videoId && item.thumbnailUrl);
}
