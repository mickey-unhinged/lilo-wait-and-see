import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Track } from "@/contexts/PlayerContext";

const LOCAL_STORAGE_KEY = "lilo-liked-songs";
const LOCAL_TRACKS_KEY = "lilo-liked-tracks-data";

interface StoredTrack {
  track: Track;
  likedAt: string;
}

export function useLikedSongs() {
  const [likedTrackIds, setLikedTrackIds] = useState<Set<string>>(new Set());
  const [likedTracks, setLikedTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Get current user
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id || null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUserId(session?.user?.id || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load likes from localStorage on mount
  useEffect(() => {
    loadFromLocalStorage();
  }, []);

  const loadFromLocalStorage = () => {
    try {
      const storedIds = localStorage.getItem(LOCAL_STORAGE_KEY);
      const storedTracks = localStorage.getItem(LOCAL_TRACKS_KEY);
      
      if (storedIds) {
        setLikedTrackIds(new Set(JSON.parse(storedIds)));
      }
      
      if (storedTracks) {
        const parsed: StoredTrack[] = JSON.parse(storedTracks);
        // Sort by likedAt descending (most recent first)
        parsed.sort((a, b) => new Date(b.likedAt).getTime() - new Date(a.likedAt).getTime());
        setLikedTracks(parsed.map(p => p.track));
      }
    } catch (e) {
      console.error("Failed to parse liked songs from localStorage:", e);
    }
  };

  const saveToLocalStorage = useCallback((ids: Set<string>, tracks: Track[]) => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(Array.from(ids)));
      
      // Save track data with timestamps
      const existing = localStorage.getItem(LOCAL_TRACKS_KEY);
      let storedTracks: StoredTrack[] = existing ? JSON.parse(existing) : [];
      
      // Update stored tracks to match current ids
      const currentIds = Array.from(ids);
      
      // Remove tracks that are no longer liked
      storedTracks = storedTracks.filter(st => currentIds.includes(st.track.id));
      
      // Add new tracks that aren't in storage yet
      const storedIds = storedTracks.map(st => st.track.id);
      for (const track of tracks) {
        if (!storedIds.includes(track.id)) {
          storedTracks.push({ track, likedAt: new Date().toISOString() });
        }
      }
      
      localStorage.setItem(LOCAL_TRACKS_KEY, JSON.stringify(storedTracks));
    } catch (e) {
      console.error("Failed to save to localStorage:", e);
    }
  }, []);

  // Fetch liked songs from Supabase when user changes
  useEffect(() => {
    if (!userId) return;

    const fetchLikedSongs = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("liked_tracks")
          .select("track_id")
          .eq("user_id", userId);

        if (error) throw error;
        
        // Merge with localStorage likes
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
        const localLikes = stored ? JSON.parse(stored) : [];
        const dbLikes = data?.map(d => d.track_id) || [];
        
        setLikedTrackIds(new Set([...localLikes, ...dbLikes]));
      } catch (err) {
        console.error("Failed to fetch liked songs:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLikedSongs();
  }, [userId]);

  const isLiked = useCallback((trackId: string) => {
    return likedTrackIds.has(trackId);
  }, [likedTrackIds]);

  const toggleLike = useCallback(async (track: Track): Promise<boolean> => {
    // Defensive check - ensure track has required properties
    if (!track || !track.id) {
      console.error("Invalid track provided to toggleLike");
      return false;
    }

    const isCurrentlyLiked = likedTrackIds.has(track.id);
    
    // Always use localStorage for external tracks (ytm-, itunes-) or when not logged in
    const isExternalTrack = track.id.startsWith("ytm-") || track.id.startsWith("itunes-") || track.id.length < 36;
    const useLocalStorage = !userId || isExternalTrack;

    const newIsLiked = !isCurrentlyLiked;

    // Optimistically update state first
    let newIds: Set<string>;
    let newTracks: Track[];
    
    if (isCurrentlyLiked) {
      newIds = new Set(likedTrackIds);
      newIds.delete(track.id);
      newTracks = likedTracks.filter(t => t.id !== track.id);
    } else {
      newIds = new Set([...likedTrackIds, track.id]);
      newTracks = [track, ...likedTracks.filter(t => t.id !== track.id)];
    }
    
    // Update state immediately
    setLikedTrackIds(newIds);
    setLikedTracks(newTracks);
    
    // Save to localStorage (always, as backup)
    saveToLocalStorage(newIds, newTracks);

    // If using database, sync in background (don't wait)
    if (!useLocalStorage) {
      // Fire and forget - don't block the UI
      (async () => {
        try {
          if (isCurrentlyLiked) {
            await supabase
              .from("liked_tracks")
              .delete()
              .eq("user_id", userId)
              .eq("track_id", track.id);
          } else {
            await supabase
              .from("liked_tracks")
              .insert({ user_id: userId, track_id: track.id });
          }
        } catch (err) {
          console.error("Failed to sync like to database:", err);
          // State is already updated, localStorage is the source of truth
        }
      })();
    }

    return newIsLiked;
  }, [userId, likedTrackIds, likedTracks, saveToLocalStorage]);

  return {
    likedTrackIds,
    likedTracks,
    isLiked,
    toggleLike,
    isLoading,
    isLoggedIn: !!userId,
  };
}