import { SectionHeader } from "./SectionHeader";
import { HorizontalScroll } from "./HorizontalScroll";
import { TrackCard } from "./TrackCard";
import { usePlayer } from "@/contexts/PlayerContext";
import { useTrendingTracks } from "@/hooks/useTracks";
import { Music } from "lucide-react";

export function TrendingSection() {
  const { data: tracks, isLoading } = useTrendingTracks(5);
  const { currentTrack, isPlaying, playTrack, setQueue } = usePlayer();
  
  const handleTrackClick = (track: typeof tracks[0]) => {
    setQueue(tracks || []);
    playTrack(track, tracks || []);
  };

  if (!isLoading && (!tracks || tracks.length === 0)) {
    return (
      <section className="px-4 py-4">
        <SectionHeader 
          title="Trending Now" 
          subtitle="What everyone's listening to"
        />
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-card/50 flex items-center justify-center mb-4">
            <Music className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">No trending tracks yet</p>
          <p className="text-sm text-muted-foreground/70">Search for music to get started</p>
        </div>
      </section>
    );
  }
  
  return (
    <section className="px-4 py-4">
      <SectionHeader 
        title="Trending Now" 
        subtitle="What everyone's listening to"
      />
      <HorizontalScroll>
        {tracks?.map((track) => (
          <TrackCard
            key={track.id}
            title={track.title}
            artist={track.artist_name}
            imageUrl={track.cover_url || track.album_cover || "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200&h=200&fit=crop"}
            isPlaying={currentTrack?.id === track.id && isPlaying}
            variant="large"
            onClick={() => handleTrackClick(track)}
          />
        ))}
      </HorizontalScroll>
    </section>
  );
}
