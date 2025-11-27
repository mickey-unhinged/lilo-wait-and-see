import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Track } from "@/contexts/PlayerContext";

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

  // Fetch liked songs when user changes
  useEffect(() => {
    if (!userId) {
      setLikedTrackIds(new Set());
      return;
    }

    const fetchLikedSongs = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("liked_tracks")
          .select("track_id")
          .eq("user_id", userId);

        if (error) throw error;
        setLikedTrackIds(new Set(data?.map(d => d.track_id) || []));
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

  const toggleLike = useCallback(async (track: Track) => {
    if (!userId) {
      // Store locally if not logged in
      const stored = localStorage.getItem("lilo-liked-songs");
      const localLikes = stored ? JSON.parse(stored) : [];
      const isCurrentlyLiked = localLikes.includes(track.id);
      
      if (isCurrentlyLiked) {
        const newLikes = localLikes.filter((id: string) => id !== track.id);
        localStorage.setItem("lilo-liked-songs", JSON.stringify(newLikes));
        setLikedTrackIds(new Set(newLikes));
      } else {
        const newLikes = [...localLikes, track.id];
        localStorage.setItem("lilo-liked-songs", JSON.stringify(newLikes));
        setLikedTrackIds(new Set(newLikes));
      }
      return !isCurrentlyLiked;
    }

    const isCurrentlyLiked = likedTrackIds.has(track.id);

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
      console.error("Failed to toggle like:", err);
      return isCurrentlyLiked;
    }
  }, [userId, likedTrackIds]);

  // Load local likes if not logged in
  useEffect(() => {
    if (!userId) {
      const stored = localStorage.getItem("lilo-liked-songs");
      if (stored) {
        setLikedTrackIds(new Set(JSON.parse(stored)));
      }
    }
  }, [userId]);

  return {
    likedTrackIds,
    isLiked,
    toggleLike,
    isLoading,
    isLoggedIn: !!userId,
  };
}
