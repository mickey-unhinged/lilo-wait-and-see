import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Track } from "@/contexts/PlayerContext";

export interface TrackWithDetails {
  id: string;
  title: string;
  artist_id: string;
  album_id: string | null;
  audio_url: string | null;
  cover_url: string | null;
  duration_ms: number;
  plays: number | null;
  is_explicit: boolean | null;
  track_number: number | null;
  lyrics: string | null;
  created_at: string | null;
  updated_at: string | null;
  artists: {
    id: string;
    name: string;
    avatar_url: string | null;
  } | null;
  albums: {
    id: string;
    title: string;
    cover_url: string | null;
  } | null;
}

function mapTrackToPlayer(track: TrackWithDetails): Track {
  return {
    id: track.id,
    title: track.title,
    artist_id: track.artist_id,
    artist_name: track.artists?.name || "Unknown Artist",
    artist_avatar: track.artists?.avatar_url || undefined,
    album_id: track.album_id || undefined,
    album_title: track.albums?.title || undefined,
    album_cover: track.albums?.cover_url || undefined,
    cover_url: track.cover_url || track.albums?.cover_url || undefined,
    audio_url: track.audio_url || undefined,
    duration_ms: track.duration_ms,
    plays: track.plays || 0,
    is_explicit: track.is_explicit || false,
  };
}

export function useTracks(limit = 20) {
  return useQuery({
    queryKey: ["tracks", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tracks")
        .select(`
          *,
          artists (id, name, avatar_url),
          albums (id, title, cover_url)
        `)
        .order("plays", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data as TrackWithDetails[]).map(mapTrackToPlayer);
    },
  });
}

export function useRecentTracks(limit = 10) {
  return useQuery({
    queryKey: ["recent-tracks", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tracks")
        .select(`
          *,
          artists (id, name, avatar_url),
          albums (id, title, cover_url)
        `)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data as TrackWithDetails[]).map(mapTrackToPlayer);
    },
  });
}

export function useTrendingTracks(limit = 10) {
  return useQuery({
    queryKey: ["trending-tracks", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tracks")
        .select(`
          *,
          artists (id, name, avatar_url),
          albums (id, title, cover_url)
        `)
        .order("plays", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data as TrackWithDetails[]).map(mapTrackToPlayer);
    },
  });
}

export function useTrackById(trackId: string | null) {
  return useQuery({
    queryKey: ["track", trackId],
    queryFn: async () => {
      if (!trackId) return null;
      
      const { data, error } = await supabase
        .from("tracks")
        .select(`
          *,
          artists (id, name, avatar_url),
          albums (id, title, cover_url)
        `)
        .eq("id", trackId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;
      return mapTrackToPlayer(data as TrackWithDetails);
    },
    enabled: !!trackId,
  });
}

export function useArtistTracks(artistId: string | null, limit = 20) {
  return useQuery({
    queryKey: ["artist-tracks", artistId, limit],
    queryFn: async () => {
      if (!artistId) return [];
      
      const { data, error } = await supabase
        .from("tracks")
        .select(`
          *,
          artists (id, name, avatar_url),
          albums (id, title, cover_url)
        `)
        .eq("artist_id", artistId)
        .order("plays", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data as TrackWithDetails[]).map(mapTrackToPlayer);
    },
    enabled: !!artistId,
  });
}

// Empty array when database has no tracks
export const demoTracks: Track[] = [];
