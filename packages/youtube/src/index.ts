export type YouTubeSearchResult = {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
};

export async function searchYouTubeVideos(input: {
  apiKey: string;
  query: string;
  maxResults?: number;
}): Promise<YouTubeSearchResult[]> {
  const url = new URL('https://www.googleapis.com/youtube/v3/search');
  url.searchParams.set('part', 'snippet');
  url.searchParams.set('type', 'video');
  url.searchParams.set('videoEmbeddable', 'true');
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
