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

// Demo tracks for when database is empty
export const demoTracks: Track[] = [
  {
    id: "demo-1",
    title: "Midnight Dreams",
    artist_id: "demo-artist-1",
    artist_name: "Luna Echo",
    cover_url: "https://images.unsplash.com/photo-1614149162883-504ce4d13909?w=400&h=400&fit=crop",
    audio_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    duration_ms: 222000,
    plays: 1250000,
  },
  {
    id: "demo-2",
    title: "Electric Nights",
    artist_id: "demo-artist-2",
    artist_name: "Neon Dreams",
    cover_url: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop",
    audio_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    duration_ms: 198000,
    plays: 890000,
  },
  {
    id: "demo-3",
    title: "Ocean Waves",
    artist_id: "demo-artist-3",
    artist_name: "The Midnight",
    cover_url: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400&h=400&fit=crop",
    audio_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    duration_ms: 245000,
    plays: 756000,
  },
  {
    id: "demo-4",
    title: "Starlight",
    artist_id: "demo-artist-4",
    artist_name: "Aurora",
    cover_url: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&h=400&fit=crop",
    audio_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
    duration_ms: 267000,
    plays: 654000,
  },
  {
    id: "demo-5",
    title: "Summer Haze",
    artist_id: "demo-artist-5",
    artist_name: "Coastal",
    cover_url: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400&h=400&fit=crop",
    audio_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
    duration_ms: 189000,
    plays: 543000,
  },
  {
    id: "demo-6",
    title: "Neon City",
    artist_id: "demo-artist-2",
    artist_name: "Neon Dreams",
    cover_url: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=400&fit=crop",
    audio_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3",
    duration_ms: 234000,
    plays: 432000,
  },
  {
    id: "demo-7",
    title: "Digital Love",
    artist_id: "demo-artist-1",
    artist_name: "Luna Echo",
    cover_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop",
    audio_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3",
    duration_ms: 212000,
    plays: 321000,
  },
  {
    id: "demo-8",
    title: "Sunset Boulevard",
    artist_id: "demo-artist-3",
    artist_name: "The Midnight",
    cover_url: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=400&fit=crop",
    audio_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3",
    duration_ms: 278000,
    plays: 210000,
  },
];
