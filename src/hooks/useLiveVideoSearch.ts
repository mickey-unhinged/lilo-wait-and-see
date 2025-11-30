import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Track } from "@/contexts/PlayerContext";

interface LiveVideoTrack {
  videoId: string;
  title: string;
  artists: { name: string }[];
  album?: { name: string };
  thumbnail?: string;
  duration?: number;
}

function normalizeThumbnail(videoId: string, raw?: string): string {
  if (raw) {
    if (raw.startsWith("//")) {
      return `https:${raw}`;
    }
    if (raw.startsWith("http")) {
      return raw;
    }
  }
  return `https://i.ytimg.com/vi/${videoId}/hq720.jpg`;
}

export function useLiveVideoSearch() {
  const [results, setResults] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchMusic = useCallback(async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("youtube-music-search", {
        body: { query },
      });

      if (fnError) throw fnError;

      const tracks: Track[] = (data?.tracks || []).map((item: LiveVideoTrack) => {
        // Get the best quality thumbnail available
        const thumbnailUrl = normalizeThumbnail(item.videoId, item.thumbnail);
        
        return {
          id: `ytm-${item.videoId}`,
          title: item.title,
          artist_id: `video-artist-${item.artists[0]?.name.toLowerCase().replace(/\s+/g, "-")}`,
          artist_name: item.artists.map((a) => a.name).join(", "),
          album_title: item.album?.name || "Lilo Live",
          album_cover: thumbnailUrl,
          cover_url: thumbnailUrl,
          audio_url: "",
          duration_ms: item.duration || 0,
          plays: 0,
          is_explicit: false,
          videoId: item.videoId,
        };
      });

      setResults(tracks);
    } catch (err) {
      console.error("Live video search error:", err);
      setError(err instanceof Error ? err.message : "Search failed");
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getAudioUrl = useCallback(async (videoId: string): Promise<string | null> => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke("youtube-audio-stream", {
        body: { videoId },
      });

      if (fnError) throw fnError;
      return data?.audioUrl || null;
    } catch (err) {
      console.error("Failed to get video audio URL:", err);
      return null;
    }
  }, []);

  const clearResults = useCallback(() => {
    setResults([]);
    setError(null);
  }, []);

  return {
    results,
    isLoading,
    error,
    searchMusic,
    getAudioUrl,
    clearResults,
  };
}

