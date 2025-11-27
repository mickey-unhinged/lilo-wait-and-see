import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Track } from "@/contexts/PlayerContext";

const LOCAL_STORAGE_KEY = "lilo-liked-songs";

export function useLikedSongs() {
  const [likedTrackIds, setLikedTrackIds] = useState<Set<string>>(new Set());
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
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setLikedTrackIds(new Set(parsed));
      } catch (e) {
        console.error("Failed to parse liked songs from localStorage:", e);
      }
    }
  }, []);

  // Fetch liked songs from Supabase when user changes (for tracks that exist in DB)
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
    const isCurrentlyLiked = likedTrackIds.has(track.id);
    
    // Always use localStorage for external tracks (ytm-, itunes-) or when not logged in
    const isExternalTrack = track.id.startsWith("ytm-") || track.id.startsWith("itunes-");
    const useLocalStorage = !userId || isExternalTrack;

    if (useLocalStorage) {
      // Handle locally
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      let localLikes: string[] = [];
      try {
        localLikes = stored ? JSON.parse(stored) : [];
      } catch (e) {
        localLikes = [];
      }
      
      let newLikes: string[];
      if (isCurrentlyLiked) {
        newLikes = localLikes.filter((id: string) => id !== track.id);
      } else {
        newLikes = [...localLikes.filter(id => id !== track.id), track.id];
      }
      
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newLikes));
      setLikedTrackIds(new Set(newLikes));
      return !isCurrentlyLiked;
    }

    // For database tracks when logged in, use Supabase
    try {
      if (isCurrentlyLiked) {
        const { error } = await supabase
          .from("liked_tracks")
          .delete()
          .eq("user_id", userId)
          .eq("track_id", track.id);

        if (error) throw error;
        
        setLikedTrackIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(track.id);
          return newSet;
        });
        return false;
      } else {
        const { error } = await supabase
          .from("liked_tracks")
          .insert({ user_id: userId, track_id: track.id });

        if (error) throw error;
        
        setLikedTrackIds(prev => new Set([...prev, track.id]));
        return true;
      }
    } catch (err) {
      console.error("Failed to toggle like in database, falling back to localStorage:", err);
      // Fallback to localStorage on error
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      let localLikes: string[] = [];
      try {
        localLikes = stored ? JSON.parse(stored) : [];
      } catch (e) {
        localLikes = [];
      }
      
      let newLikes: string[];
      if (isCurrentlyLiked) {
        newLikes = localLikes.filter((id: string) => id !== track.id);
      } else {
        newLikes = [...localLikes.filter(id => id !== track.id), track.id];
      }
      
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newLikes));
      setLikedTrackIds(new Set(newLikes));
      return !isCurrentlyLiked;
    }
  }, [userId, likedTrackIds]);

  return {
    likedTrackIds,
    isLiked,
    toggleLike,
    isLoading,
    isLoggedIn: !!userId,
  };
}
