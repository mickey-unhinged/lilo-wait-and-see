import { SectionHeader } from "./SectionHeader";
import { HorizontalScroll } from "./HorizontalScroll";
import { TrackCard } from "./TrackCard";
import { usePlayer } from "@/contexts/PlayerContext";
import { useTracks, demoTracks } from "@/hooks/useTracks";

export function RecentlyPlayedSection() {
  const { data: tracks, isLoading } = useTracks(5);
  const { currentTrack, isPlaying, playTrack, setQueue } = usePlayer();
  
  // Use demo tracks if database is empty
  const displayTracks = tracks && tracks.length > 0 ? tracks : demoTracks.slice(0, 5);
  
  const handleTrackClick = (track: typeof displayTracks[0]) => {
    setQueue(displayTracks);
    playTrack(track, displayTracks);
  };
  
  return (
    <section className="px-4 py-4">
      <SectionHeader 
        title="Recently Played" 
        subtitle="Jump back in"
      />
      <HorizontalScroll>
        {displayTracks.map((track) => (
          <TrackCard
            key={track.id}
            title={track.title}
            artist={track.artist_name}
            imageUrl={track.cover_url || track.album_cover || "https://images.unsplash.com/photo-1614149162883-504ce4d13909?w=200&h=200&fit=crop"}
            isPlaying={currentTrack?.id === track.id && isPlaying}
            onClick={() => handleTrackClick(track)}
          />
        ))}
      </HorizontalScroll>
    </section>
  );
}
