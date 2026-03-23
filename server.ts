import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { google } from "googleapis";

const youtube = google.youtube({
  version: "v3",
  auth: process.env.YOUTUBE_API_KEY,
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // YouTube Search API
  app.get("/api/search", async (req, res) => {
    const { q } = req.query;
    if (!q || typeof q !== "string") {
      return res.status(400).json({ error: "Query is required" });
    }

    if (!process.env.YOUTUBE_API_KEY) {
      return res.status(500).json({ error: "YOUTUBE_API_KEY is not configured" });
    }

    try {
      const response = await youtube.search.list({
        part: ["snippet"],
        q,
        maxResults: 10,
        type: ["video"],
      });

      const results = response.data.items?.map((item) => ({
        id: item.id?.videoId,
        title: item.snippet?.title,
        thumbnail: item.snippet?.thumbnails?.default?.url,
        channelTitle: item.snippet?.channelTitle,
      }));

      res.json(results);
    } catch (error: any) {
      console.error("YouTube Search Error:", error.message);
      res.status(500).json({ error: "Failed to search YouTube" });
    }
  });

  // Simple JWT decoder for prototype
  const verifyAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const token = authHeader.split(' ')[1];
    try {
      // Decode JWT payload (base64url encoded)
      const payloadBase64 = token.split('.')[1];
      const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString());
      if (payload.email !== 'johnbozorgi@gmail.com') {
        return res.status(403).json({ error: 'Forbidden' });
      }
      next();
    } catch (e) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  };

  // Admin Dashboard Stats Endpoint
  app.get("/api/admin/stats", verifyAdmin, (req, res) => {
    res.json({
      totalUsers: 1245,
      activeRooms: 42,
      totalTracksPlayed: 8930,
      recentLogs: [
        { id: 1, level: 'info', event: 'room_created', message: 'User created room "Chill Vibes"', time: new Date(Date.now() - 1000 * 60 * 5).toISOString() },
        { id: 2, level: 'info', event: 'user_joined', message: 'User joined room "Chill Vibes"', time: new Date(Date.now() - 1000 * 60 * 12).toISOString() },
        { id: 3, level: 'warning', event: 'auth_failed', message: 'Failed login attempt', time: new Date(Date.now() - 1000 * 60 * 45).toISOString() },
        { id: 4, level: 'info', event: 'track_played', message: 'Track "Lofi Hip Hop" played', time: new Date(Date.now() - 1000 * 60 * 60).toISOString() },
        { id: 5, level: 'error', event: 'api_error', message: 'YouTube API rate limit exceeded', time: new Date(Date.now() - 1000 * 60 * 120).toISOString() },
      ],
      activeRoomsList: [
        { id: '1', code: 'A1B2C', name: 'Study Session', host: 'Alice', members: 5, status: 'active' },
        { id: '2', code: 'X9Y8Z', name: 'Workout Mix', host: 'Bob', members: 12, status: 'active' },
        { id: '3', code: 'M5N6P', name: 'Late Night Drives', host: 'Charlie', members: 3, status: 'active' },
      ]
    });
  });

  // Mock endpoint to simulate banning a user or ending a room from Admin panel
  app.post("/api/admin/action", verifyAdmin, (req, res) => {
    const { action, targetId } = req.body;
    console.log(`Admin action received: ${action} on target ${targetId}`);
    // Simulate DB operation
    res.json({ success: true, message: `Action ${action} executed successfully.` });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
