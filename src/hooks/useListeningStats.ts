import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface TrackStat {
  trackId: string;
  title: string;
  artist: string;
  cover: string;
  playCount: number;
}

interface ArtistStat {
  name: string;
  playCount: number;
  cover?: string;
}

interface GenreStat {
  name: string;
  playCount: number;
  color: string;
}

interface ListeningStats {
  topTracks: TrackStat[];
  topArtists: ArtistStat[];
  topGenres: GenreStat[];
  totalListeningTime: number; // in minutes
  totalTracks: number;
  isLoading: boolean;
}

type Period = "week" | "month" | "allTime";

export function useListeningStats(userId: string | undefined, period: Period = "month") {
  const [stats, setStats] = useState<ListeningStats>({
    topTracks: [],
    topArtists: [],
    topGenres: [],
    totalListeningTime: 0,
    totalTracks: 0,
    isLoading: true,
  });

  const fetchStats = useCallback(async () => {
    if (!userId) {
      setStats(prev => ({ ...prev, isLoading: false }));
      return;
    }

    setStats(prev => ({ ...prev, isLoading: true }));

    try {
      // Calculate date range based on period
      const now = new Date();
      let startDate: Date;
      
      switch (period) {
        case "week":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "month":
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case "allTime":
        default:
          startDate = new Date(0);
          break;
      }

      // Fetch listening activity from database
      const { data: activityData, error } = await supabase
        .from("listening_activity")
        .select("*")
        .eq("user_id", userId)
        .gte("played_at", startDate.toISOString())
        .order("played_at", { ascending: false });

      if (error) throw error;

      // Also get data from localStorage for more complete history
      // localStorage format is { track: Track, playedAt: string }[]
      const localHistory = JSON.parse(localStorage.getItem("lilo-play-history") || "[]");
      const filteredLocalHistory = localHistory.filter((item: any) => {
        const playedAt = item.playedAt || item.played_at;
        if (!playedAt) return period === "allTime";
        const playedDate = new Date(playedAt);
        return playedDate >= startDate;
      });

      // Combine and deduplicate activity
      const combinedActivity = [
        ...(activityData || []).map((item: any) => ({
          trackId: item.track_id,
          title: item.track_title,
          artist: item.track_artist || "Unknown Artist",
          cover: item.track_cover,
          playedAt: item.played_at,
        })),
        ...filteredLocalHistory.map((entry: any) => {
          // Handle both formats: { track: Track, playedAt } and flat format
          const track = entry.track || entry;
          return {
            trackId: track.id || track.trackId || entry.id,
            title: track.title || entry.title,
            artist: track.artist_name || track.artist || entry.artist_name || entry.artist || "Unknown Artist",
            cover: track.cover_url || track.album_cover || track.thumbnail || entry.cover || entry.thumbnail,
            playedAt: entry.playedAt || entry.played_at,
          };
        }),
      ];

      // Calculate top tracks
      const trackCounts = new Map<string, TrackStat>();
      combinedActivity.forEach((item: any) => {
        const key = `${item.title}-${item.artist}`;
        const existing = trackCounts.get(key);
        if (existing) {
          existing.playCount++;
        } else {
          trackCounts.set(key, {
            trackId: item.trackId,
            title: item.title,
            artist: item.artist,
            cover: item.cover || "",
            playCount: 1,
          });
        }
      });
      const topTracks = Array.from(trackCounts.values())
        .sort((a, b) => b.playCount - a.playCount)
        .slice(0, 10);

      // Calculate top artists
      const artistCounts = new Map<string, ArtistStat>();
      combinedActivity.forEach((item: any) => {
        const existing = artistCounts.get(item.artist);
        if (existing) {
          existing.playCount++;
        } else {
          artistCounts.set(item.artist, {
            name: item.artist,
            playCount: 1,
            cover: item.cover,
          });
        }
      });
      const topArtists = Array.from(artistCounts.values())
        .sort((a, b) => b.playCount - a.playCount)
        .slice(0, 10);

      // Estimate genres based on artist names (simplified)
      const genreKeywords: Record<string, { color: string; keywords: string[] }> = {
        "Pop": { color: "#FF6B9D", keywords: ["pop", "taylor", "ariana", "dua", "bieber", "sheeran"] },
        "Hip Hop": { color: "#9B59B6", keywords: ["rap", "hip", "drake", "kendrick", "travis", "kanye", "eminem"] },
        "R&B": { color: "#3498DB", keywords: ["r&b", "rnb", "usher", "beyonce", "chris brown", "weeknd"] },
        "Rock": { color: "#E74C3C", keywords: ["rock", "band", "foo fighters", "nirvana", "queen", "beatles"] },
        "Electronic": { color: "#1ABC9C", keywords: ["dj", "edm", "electronic", "marshmello", "skrillex", "deadmau5"] },
        "Latin": { color: "#F39C12", keywords: ["latin", "reggaeton", "bad bunny", "shakira", "daddy yankee"] },
        "Country": { color: "#27AE60", keywords: ["country", "morgan wallen", "luke bryan", "carrie"] },
        "Alternative": { color: "#8E44AD", keywords: ["alternative", "indie", "arctic", "imagine dragons"] },
      };

      const genreCounts = new Map<string, GenreStat>();
      topArtists.forEach(artist => {
        const artistLower = artist.name.toLowerCase();
        let matchedGenre = "Other";
        let matchedColor = "#95A5A6";
        
        for (const [genre, { color, keywords }] of Object.entries(genreKeywords)) {
          if (keywords.some(kw => artistLower.includes(kw))) {
            matchedGenre = genre;
            matchedColor = color;
            break;
          }
        }
        
        const existing = genreCounts.get(matchedGenre);
        if (existing) {
          existing.playCount += artist.playCount;
        } else {
          genreCounts.set(matchedGenre, {
            name: matchedGenre,
            playCount: artist.playCount,
            color: matchedColor,
          });
        }
      });
      const topGenres = Array.from(genreCounts.values())
        .sort((a, b) => b.playCount - a.playCount)
        .slice(0, 5);

      // Estimate total listening time (assume average 3.5 mins per track)
      const totalTracks = combinedActivity.length;
      const totalListeningTime = Math.round(totalTracks * 3.5);

      setStats({
        topTracks,
        topArtists,
        topGenres,
        totalListeningTime,
        totalTracks,
        isLoading: false,
      });
    } catch (error) {
      console.error("Failed to fetch listening stats:", error);
      setStats(prev => ({ ...prev, isLoading: false }));
    }
  }, [userId, period]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { ...stats, refetch: fetchStats };
}
