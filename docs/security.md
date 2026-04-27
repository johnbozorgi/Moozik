# RoomBeat Security Notes

## YouTube API Key

Never commit or expose `YOUTUBE_API_KEY` in frontend code. The key must be read only by the backend through environment variables.

If a key is pasted into chat, screenshots, logs, or public code, treat it as compromised:

1. Rotate the key in Google Cloud Console.
2. Restrict the replacement key to the minimum API set needed for YouTube Data API v3.
3. Add HTTP referrer restrictions for approved web domains, including `roombeat-beta.vercel.app`.
4. Add separate keys for local development and production.
5. Monitor quota usage for unexpected spikes.

The public web app should call RoomBeat backend endpoints such as `/youtube/search`, `/youtube/videos`, and `/youtube/playlist-items`, never Google APIs directly.
