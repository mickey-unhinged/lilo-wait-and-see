import { useState } from "react";
import type { Track } from "@/contexts/PlayerContext";

interface ITunesResult {
  trackId: number;
  trackName: string;
  artistName: string;
  collectionName: string;
  artworkUrl100: string;
  previewUrl: string;
  trackTimeMillis: number;
  primaryGenreName: string;
}

interface ITunesResponse {
  resultCount: number;
  results: ITunesResult[];
}

export function useMusicSearch() {
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
      // iTunes Search API - free, no key needed
      const response = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=song&limit=20`
      );

      if (!response.ok) {
        throw new Error("Search failed");
      }

      const data: ITunesResponse = await response.json();

      const tracks: Track[] = data.results
        .filter((item) => item.previewUrl) // Only include tracks with previews
        .map((item) => ({
          id: `itunes-${item.trackId}`,
          title: item.trackName,
          artist_id: `itunes-artist-${item.artistName.toLowerCase().replace(/\s+/g, "-")}`,
          artist_name: item.artistName,
          album_title: item.collectionName,
          cover_url: item.artworkUrl100.replace("100x100", "400x400"), // Get higher res artwork
          audio_url: item.previewUrl,
          duration_ms: item.trackTimeMillis || 30000,
          plays: 0,
          is_explicit: false,
        }));

      setResults(tracks);
    } catch (err) {
      console.error("Search error:", err);
      setError(err instanceof Error ? err.message : "Search failed");
      setResults([]);
    } finally {
      setIsLoading(false);
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
    clearResults,
  };
}
