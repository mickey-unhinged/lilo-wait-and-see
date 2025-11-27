import { SectionHeader } from "./SectionHeader";
import { HorizontalScroll } from "./HorizontalScroll";
import { TrackCard } from "./TrackCard";
import { usePlayer } from "@/contexts/PlayerContext";
import { useTrendingTracks, demoTracks } from "@/hooks/useTracks";

export function TrendingSection() {
  const { data: tracks } = useTrendingTracks(5);
  const { currentTrack, isPlaying, playTrack, setQueue } = usePlayer();
  
  // Use demo tracks if database is empty (different slice for variety)
  const displayTracks = tracks && tracks.length > 0 ? tracks : demoTracks.slice(3, 8);
  
  const handleTrackClick = (track: typeof displayTracks[0]) => {
    setQueue(displayTracks);
    playTrack(track, displayTracks);
  };
  
  return (
    <section className="px-4 py-4">
      <SectionHeader 
        title="Trending Now" 
        subtitle="What everyone's listening to"
      />
      <HorizontalScroll>
        {displayTracks.map((track) => (
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
