import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Track } from "@/contexts/PlayerContext";

interface YouTubeMusicTrack {
  videoId: string;
  title: string;
  artists: { name: string }[];
  album?: { name: string };
  thumbnail: string;
  duration?: number;
}

export function useYouTubeMusicSearch() {
  const [results, setResults] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchMusic = async (query: string) => {
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

      const tracks: Track[] = (data?.tracks || []).map((item: YouTubeMusicTrack) => ({
        id: `ytm-${item.videoId}`,
        title: item.title,
        artist_id: `ytm-artist-${item.artists[0]?.name.toLowerCase().replace(/\s+/g, "-")}`,
        artist_name: item.artists.map((a) => a.name).join(", "),
        album_title: item.album?.name || "YouTube Music",
        cover_url: item.thumbnail,
        audio_url: "", // Will be fetched when playing
        duration_ms: item.duration || 0,
        plays: 0,
        is_explicit: false,
        videoId: item.videoId, // Store for fetching audio URL
      }));

      setResults(tracks);
    } catch (err) {
      console.error("YouTube Music search error:", err);
      setError(err instanceof Error ? err.message : "Search failed");
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getAudioUrl = async (videoId: string): Promise<string | null> => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke("youtube-audio-stream", {
        body: { videoId },
      });

      if (fnError) throw fnError;
      return data?.audioUrl || null;
    } catch (err) {
      console.error("Failed to get audio URL:", err);
      return null;
    }
  };

  const clearResults = () => {
    setResults([]);
    setError(null);
  };

  return {
    results,
    isLoading,
    error,
    searchMusic,
    getAudioUrl,
    clearResults,
  };
}
