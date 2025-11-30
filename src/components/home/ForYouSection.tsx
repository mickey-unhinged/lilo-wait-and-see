import { useState, useEffect, useRef } from "react";
import { usePlayer, Track } from "@/contexts/PlayerContext";
import { SectionHeader } from "./SectionHeader";
import { HorizontalScroll } from "./HorizontalScroll";
import { TrackCard } from "./TrackCard";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { extractKeywordsFromHistory } from "@/hooks/useSearchHistory";

export function ForYouSection() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { playTrack, setQueue } = usePlayer();
  const sessionSeed = useRef(Math.floor(Math.random() * 1000) + 100);

  useEffect(() => {
    fetchPersonalizedTracks();

    // Refresh every 12 minutes for variety
    const interval = setInterval(fetchPersonalizedTracks, 12 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchPersonalizedTracks = async () => {
    setIsLoading(true);
    try {
      const stored = localStorage.getItem("lilo-play-history");
      let seedArtists: string[] = [];

      if (stored) {
        const history = JSON.parse(stored);
        const artistCounts: Record<string, number> = {};
        history.forEach((entry: any) => {
          const artist = entry.track?.artist_name || entry.track?.artist;
          if (artist) {
            artistCounts[artist] = (artistCounts[artist] || 0) + 1;
          }
        });

        seedArtists = Object.entries(artistCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 4)
          .map(([artist]) => artist);
      }

      const searchTerms = extractKeywordsFromHistory();

      const { data, error } = await supabase.functions.invoke("trending-suggestions", {
        body: {
          type: "personalized",
          seedArtists,
          searchTerms,
          sectionOffset: sessionSeed.current,
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
            track={track}
            showDownload
          />
        ))}
      </HorizontalScroll>
    </section>
  );
}
