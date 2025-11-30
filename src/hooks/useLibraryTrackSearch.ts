import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Track } from "@/contexts/PlayerContext";

interface TrackRow {
  id: string;
  title: string;
  artist_id: string;
  album_id: string | null;
  audio_url: string | null;
  cover_url: string | null;
  duration_ms: number;
  plays: number | null;
  is_explicit: boolean | null;
  artists?: {
    id: string;
    name: string;
    avatar_url: string | null;
  } | null;
  albums?: {
    id: string;
    title: string;
    cover_url: string | null;
  } | null;
}

const mapRowToTrack = (row: TrackRow): Track => ({
  id: row.id,
  title: row.title,
  artist_id: row.artist_id,
  artist_name: row.artists?.name || "Unknown Artist",
  artist_avatar: row.artists?.avatar_url || undefined,
  album_id: row.album_id || undefined,
  album_title: row.albums?.title || undefined,
  album_cover: row.albums?.cover_url || undefined,
  cover_url: row.cover_url || row.albums?.cover_url || undefined,
  audio_url: row.audio_url || undefined,
  duration_ms: row.duration_ms,
  plays: row.plays || 0,
  is_explicit: row.is_explicit || false,
});

export function useLibraryTrackSearch() {
  const [results, setResults] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchTracks = useCallback(async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: dbError } = await supabase
        .from("tracks")
        .select(
          `
          *,
          artists:artists ( id, name, avatar_url ),
          albums:albums ( id, title, cover_url )
        `
        )
        .or(`title.ilike.%${query}%,artists.name.ilike.%${query}%`)
        .order("plays", { ascending: false })
        .limit(30);

      if (dbError) throw dbError;

      setResults((data as TrackRow[] | null)?.map(mapRowToTrack) || []);
    } catch (err) {
      console.error("Track search failed:", err);
      setError(err instanceof Error ? err.message : "Search failed");
      setResults([]);
    } finally {
      setIsLoading(false);
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
    searchTracks,
    clearResults,
  };
}

