import type { VercelRequest, VercelResponse } from "@vercel/node";
import axios from "axios";

// Vercel serverless 타임아웃: 10초
// ★ 핵심 수정: YouTube API 키가 있으면 공식 API만 사용 (빠름, ~1-2초)
//              ytpl / scraping fallback 완전 제거 (이게 무한로딩의 원인이었음)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { id: playlistId } = req.query;
  if (!playlistId || typeof playlistId !== "string") {
    return res.status(400).json({ message: "Playlist ID is required" });
  }

  const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

  // API 키 없으면 즉시 에러 반환 (무한로딩 방지)
  if (!YOUTUBE_API_KEY) {
    console.error("[playlist] YOUTUBE_API_KEY is not set in Vercel environment variables!");
    return res.status(500).json({
      message: "YouTube API key is not configured. Please add YOUTUBE_API_KEY in Vercel → Settings → Environment Variables, then Redeploy.",
    });
  }

  try {
    console.log(`[playlist] Fetching playlist: ${playlistId}`);

    // ── 곡 목록 가져오기 (페이지네이션, 최대 200곡) ──
    const allSongs: { id: string; title: string; thumbnail: string }[] = [];
    let nextPageToken: string | undefined;
    let page = 0;

    do {
      const itemsRes = await axios.get(
        "https://www.googleapis.com/youtube/v3/playlistItems",
        {
          params: {
            part: "snippet",
            playlistId,
            maxResults: 50,
            key: YOUTUBE_API_KEY,
            ...(nextPageToken ? { pageToken: nextPageToken } : {}),
          },
          timeout: 7000, // ★ 7초 타임아웃 (Vercel 10초 제한 내)
        }
      );

      const items: any[] = itemsRes.data.items ?? [];
      const songs = items
        .filter(
          (item) =>
            item.snippet?.resourceId?.videoId &&
            item.snippet?.title !== "Deleted video" &&
            item.snippet?.title !== "Private video"
        )
        .map((item) => ({
          id: item.snippet.resourceId.videoId,
          title: item.snippet.title,
          thumbnail:
            item.snippet.thumbnails?.medium?.url ||
            item.snippet.thumbnails?.default?.url ||
            `https://img.youtube.com/vi/${item.snippet.resourceId.videoId}/mqdefault.jpg`,
        }));

      allSongs.push(...songs);
      nextPageToken = itemsRes.data.nextPageToken;
      page++;
    } while (nextPageToken && page < 4); // 최대 4 페이지 = 200곡

    if (allSongs.length === 0) {
      return res.status(404).json({
        message: "Playlist is empty, or all videos are private/deleted. Make sure the playlist is set to Public.",
      });
    }

    // ── 플레이리스트 제목 가져오기 ──
    let title = "YouTube Playlist";
    try {
      const plRes = await axios.get(
        "https://www.googleapis.com/youtube/v3/playlists",
        {
          params: { part: "snippet", id: playlistId, key: YOUTUBE_API_KEY },
          timeout: 5000,
        }
      );
      title = plRes.data.items?.[0]?.snippet?.title || title;
    } catch {
      // 제목 못 가져와도 곡 목록은 반환
    }

    console.log(`[playlist] OK: "${title}" (${allSongs.length} songs)`);
    return res.status(200).json({ id: playlistId, title, songs: allSongs });

  } catch (err: any) {
    const status = err?.response?.status;
    const apiMsg = err?.response?.data?.error?.message;
    console.error("[playlist] Error:", status, apiMsg || err?.message);

    if (status === 403) {
      return res.status(403).json({
        message: `YouTube API error: ${apiMsg || "API key is invalid or quota exceeded"}. Check YOUTUBE_API_KEY in Vercel settings.`,
      });
    }
    if (status === 404) {
      return res.status(404).json({
        message: "Playlist not found. Make sure it is set to Public on YouTube.",
      });
    }
    if (err.code === "ECONNABORTED" || err.code === "ERR_CANCELED") {
      return res.status(504).json({ message: "YouTube API request timed out. Please try again." });
    }

    return res.status(500).json({
      message: apiMsg || err?.message || "Failed to fetch playlist.",
    });
  }
}
