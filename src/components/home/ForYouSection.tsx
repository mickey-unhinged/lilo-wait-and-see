import { useState, useEffect } from "react";
import { usePlayer, Track } from "@/contexts/PlayerContext";
import { SectionHeader } from "./SectionHeader";
import { HorizontalScroll } from "./HorizontalScroll";
import { TrackCard } from "./TrackCard";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function ForYouSection() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { playTrack, setQueue } = usePlayer();

  useEffect(() => {
    fetchPersonalizedTracks();
  }, []);

  const fetchPersonalizedTracks = async () => {
    setIsLoading(true);
    try {
      // Get user's play history from localStorage
      const stored = localStorage.getItem("lilo-play-history");
      let seedArtists: string[] = [];
      let seedGenres: string[] = [];

      if (stored) {
        const history = JSON.parse(stored);
        // Extract unique artists from history
        const artistCounts: Record<string, number> = {};
        history.forEach((entry: any) => {
          const artist = entry.track?.artist_name || entry.track?.artist;
          if (artist) {
            artistCounts[artist] = (artistCounts[artist] || 0) + 1;
          }
        });
        
        // Get top 3 artists
        seedArtists = Object.entries(artistCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3)
          .map(([artist]) => artist);
      }

      // If no history, use default popular genres
      if (seedArtists.length === 0) {
        seedGenres = ["pop", "hip hop", "r&b"];
      }

      // Call edge function to get personalized recommendations
      const { data, error } = await supabase.functions.invoke("trending-suggestions", {
        body: {
          type: "personalized",
          seedArtists,
          seedGenres,
          limit: 12,
        },
      });

      if (error) throw error;

      if (data?.tracks && Array.isArray(data.tracks)) {
        setTracks(data.tracks);
      }
    } catch (error) {
      console.error("Failed to fetch personalized tracks:", error);
      setTracks([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTrackClick = (track: Track) => {
    setQueue(tracks);
    playTrack(track, tracks);
  };

  if (isLoading) {
    return (
      <section className="mb-8">
        <SectionHeader 
          title="✨ For You" 
          subtitle="Personalized picks based on your taste"
          sectionKey="for-you"
        />
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </section>
    );
  }

  if (tracks.length === 0) {
    return null;
  }

  return (
    <section className="mb-8">
      <SectionHeader 
        title="✨ For You" 
        subtitle="Personalized picks based on your taste"
        sectionKey="for-you"
      />
      <HorizontalScroll>
        {tracks.map((track) => (
          <TrackCard
            key={track.id}
            title={track.title}
            artist={track.artist_name}
            imageUrl={track.cover_url || `https://i.ytimg.com/vi/${track.videoId}/hqdefault.jpg`}
            onClick={() => handleTrackClick(track)}
          />
        ))}
      </HorizontalScroll>
    </section>
  );
}
