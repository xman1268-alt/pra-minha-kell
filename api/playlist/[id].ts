import type { VercelRequest, VercelResponse } from "@vercel/node";
import axios from "axios";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { id: playlistId } = req.query;

  if (!playlistId || typeof playlistId !== "string") {
    return res.status(400).json({ message: "Playlist ID is required" });
  }

  try {
    const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
    console.log("[playlist] API key present:", !!YOUTUBE_API_KEY);

    // --- Strategy 1: Official YouTube Data API v3 ---
    if (YOUTUBE_API_KEY) {
      console.log("[playlist] Trying YouTube Data API v3...");
      try {
        const response = await axios.get(
          `https://www.googleapis.com/youtube/v3/playlistItems`,
          {
            params: {
              part: "snippet",
              playlistId,
              maxResults: 50,
              key: YOUTUBE_API_KEY,
            },
          }
        );
        const items = response.data.items;
        if (items && items.length > 0) {
          const songs = items
            .filter((item: any) => item.snippet?.resourceId?.videoId)
            .map((item: any) => ({
              id: item.snippet.resourceId.videoId,
              title: item.snippet.title,
              thumbnail:
                item.snippet.thumbnails?.medium?.url ||
                item.snippet.thumbnails?.default?.url ||
                "",
            }));

          const plRes = await axios.get(
            `https://www.googleapis.com/youtube/v3/playlists`,
            {
              params: { part: "snippet", id: playlistId, key: YOUTUBE_API_KEY },
            }
          );
          const title =
            plRes.data.items?.[0]?.snippet?.title || "YouTube Playlist";

          return res.status(200).json({ id: playlistId, title, songs });
        }
      } catch (apiErr) {
        console.warn("YouTube API failed, trying scrape fallback:", apiErr);
      }
    }

    // --- Strategy 2: ytpl library ---
    try {
      const ytpl = (await import("ytpl")).default;
      const playlist = await ytpl(playlistId, { limit: 100 });
      if (playlist?.items?.length > 0) {
        const songs = playlist.items.map((item) => ({
          id: item.id,
          title: item.title,
          thumbnail: item.bestThumbnail?.url || "",
        }));
        return res.status(200).json({
          id: playlist.id,
          title: playlist.title,
          songs,
        });
      }
    } catch (ytplErr) {
      console.warn("ytpl failed, trying manual scrape:", ytplErr);
    }

    // --- Strategy 3: Manual HTML scrape ---
    try {
      const response = await axios.get(
        `https://www.youtube.com/playlist?list=${playlistId}`,
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept-Language": "en-US,en;q=0.9",
          },
        }
      );

      const html = response.data;
      const jsonMatch =
        html.match(/var ytInitialData = (\{.*?\});/) ||
        html.match(/window\["ytInitialData"\] = (\{.*?\});/);

      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[1]);
        const sidebar = data.sidebar?.playlistSidebarRenderer?.items;
        const playlistTitle =
          sidebar?.[0]?.playlistSidebarPrimaryInfoRenderer?.title?.runs?.[0]
            ?.text || "YouTube Playlist";

        const tabs = data.contents?.twoColumnBrowseResultsRenderer?.tabs;
        const playlistVideoList =
          tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents?.[0]
            ?.itemSectionRenderer?.contents?.[0]?.playlistVideoListRenderer
            ?.contents;

        if (playlistVideoList?.length > 0) {
          const songs = playlistVideoList
            .filter((item: any) => item.playlistVideoRenderer)
            .map((item: any) => {
              const video = item.playlistVideoRenderer;
              return {
                id: video.videoId,
                title:
                  video.title?.runs?.[0]?.text ||
                  video.title?.accessibility?.accessibilityData?.label ||
                  "Unknown Title",
                thumbnail: video.thumbnail?.thumbnails?.[0]?.url || "",
              };
            });

          if (songs.length > 0) {
            return res.status(200).json({
              id: playlistId,
              title: playlistTitle,
              songs,
            });
          }
        }
      }
    } catch (scrapeErr) {
      console.warn("Manual scrape failed:", scrapeErr);
    }

    return res
      .status(404)
      .json({ message: "Playlist not found or empty. Make sure it's public." });
  } catch (err) {
    console.error("Error fetching playlist:", err);
    res.status(500).json({
      message: "Failed to fetch playlist. It might be private or invalid.",
    });
  }
}
