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

  const saveToLocalStorage = (ids: Set<string>, tracks: Track[]) => {
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
  };

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
    const isCurrentlyLiked = likedTrackIds.has(track.id);
    
    // Always use localStorage for external tracks (ytm-, itunes-) or when not logged in
    const isExternalTrack = track.id.startsWith("ytm-") || track.id.startsWith("itunes-");
    const useLocalStorage = !userId || isExternalTrack;

    let newIsLiked = !isCurrentlyLiked;

    if (useLocalStorage) {
      // Handle locally
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
      
      setLikedTrackIds(newIds);
      setLikedTracks(newTracks);
      saveToLocalStorage(newIds, newTracks);
      return newIsLiked;
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
        
        const newIds = new Set(likedTrackIds);
        newIds.delete(track.id);
        const newTracks = likedTracks.filter(t => t.id !== track.id);
        
        setLikedTrackIds(newIds);
        setLikedTracks(newTracks);
        saveToLocalStorage(newIds, newTracks);
        return false;
      } else {
        const { error } = await supabase
          .from("liked_tracks")
          .insert({ user_id: userId, track_id: track.id });

        if (error) throw error;
        
        const newIds = new Set([...likedTrackIds, track.id]);
        const newTracks = [track, ...likedTracks.filter(t => t.id !== track.id)];
        
        setLikedTrackIds(newIds);
        setLikedTracks(newTracks);
        saveToLocalStorage(newIds, newTracks);
        return true;
      }
    } catch (err) {
      console.error("Failed to toggle like in database, falling back to localStorage:", err);
      // Fallback to localStorage on error
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
      
      setLikedTrackIds(newIds);
      setLikedTracks(newTracks);
      saveToLocalStorage(newIds, newTracks);
      return newIsLiked;
    }
  }, [userId, likedTrackIds, likedTracks]);

  return {
    likedTrackIds,
    likedTracks,
    isLiked,
    toggleLike,
    isLoading,
    isLoggedIn: !!userId,
  };
}
