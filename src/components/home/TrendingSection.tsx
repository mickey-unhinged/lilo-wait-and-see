import { useState, useEffect } from "react";
import { SectionHeader } from "./SectionHeader";
import { HorizontalScroll } from "./HorizontalScroll";
import { TrackCard } from "./TrackCard";
import { usePlayer, Track } from "@/contexts/PlayerContext";
import { Music, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function TrendingSection() {
  const [trendingTracks, setTrendingTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { currentTrack, isPlaying, playTrack, setQueue } = usePlayer();

  // Fetch trending from API
  useEffect(() => {
    const fetchTrending = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("trending-suggestions");

        if (error) throw error;

        if (data?.tracks && data.tracks.length > 0) {
          setTrendingTracks(data.tracks);
        }
      } catch (e) {
        console.error("Failed to fetch trending:", e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTrending();

    // Refresh every 10 minutes
    const interval = setInterval(fetchTrending, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleTrackClick = (track: Track) => {
    setQueue(trendingTracks);
    playTrack(track, trendingTracks);
  };

  if (isLoading) {
    return (
      <section className="px-4 py-4">
        <SectionHeader title="Trending Now" subtitle="Hot tracks for you" />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </section>
    );
  }

  if (trendingTracks.length === 0) {
    return (
      <section className="px-4 py-4">
        <SectionHeader title="Trending Now" subtitle="Hot tracks for you" />
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-card/50 flex items-center justify-center mb-4">
            <Music className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">No trending tracks</p>
          <p className="text-sm text-muted-foreground/70">Check back later for new suggestions</p>
        </div>
      </section>
    );
  }

  return (
    <section className="px-4 py-4">
      <SectionHeader
        title="Trending Now"
        subtitle="Hot tracks for you"
        sectionKey="trending"
      />
      <HorizontalScroll>
        {trendingTracks.map((track, index) => (
          <TrackCard
            key={`${track.id}-${index}`}
            title={track.title}
            artist={track.artist_name}
            imageUrl={
              track.cover_url ||
              track.album_cover ||
              "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200&h=200&fit=crop"
            }
            isPlaying={currentTrack?.id === track.id && isPlaying}
            variant="large"
            onClick={() => handleTrackClick(track)}
          />
        ))}
      </HorizontalScroll>
    </section>
  );
}
