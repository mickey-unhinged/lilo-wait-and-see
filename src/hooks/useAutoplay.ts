import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Track } from "@/contexts/PlayerContext";

export function useAutoplay() {
  const fetchSimilarTracks = useCallback(async (currentTrack: Track): Promise<Track[]> => {
    if (!currentTrack) return [];
    
    try {
      // Extract genre hints from the track
      const artistName = currentTrack.artist_name;
      const title = currentTrack.title;
      
      // Create search queries based on current track
      const searchQueries = [
        `${artistName} similar songs`,
        `songs like ${title}`,
        artistName,
      ];
      
      const { data, error } = await supabase.functions.invoke("trending-suggestions", {
        body: {
          type: "autoplay",
          seedArtists: [artistName],
          currentTrackId: currentTrack.id,
          limit: 15,
        },
      });
      
      if (error) throw error;
      
      // Filter out the current track
      const tracks = (data?.tracks || []).filter(
        (t: Track) => t.id !== currentTrack.id
      );
      
      return tracks;
    } catch (err) {
      console.error("Failed to fetch similar tracks for autoplay:", err);
      return [];
    }
  }, []);

  return { fetchSimilarTracks };
}
