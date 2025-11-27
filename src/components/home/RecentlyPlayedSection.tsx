import { SectionHeader } from "./SectionHeader";
import { HorizontalScroll } from "./HorizontalScroll";
import { TrackCard } from "./TrackCard";
import { usePlayer } from "@/contexts/PlayerContext";
import { useTracks } from "@/hooks/useTracks";
import { Clock } from "lucide-react";

export function RecentlyPlayedSection() {
  const { data: tracks, isLoading } = useTracks(5);
  const { currentTrack, isPlaying, playTrack, setQueue } = usePlayer();
  
  const handleTrackClick = (track: typeof tracks[0]) => {
    setQueue(tracks || []);
    playTrack(track, tracks || []);
  };

  if (!isLoading && (!tracks || tracks.length === 0)) {
    return (
      <section className="px-4 py-4">
        <SectionHeader 
          title="Recently Played" 
          subtitle="Jump back in"
        />
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-card/50 flex items-center justify-center mb-4">
            <Clock className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">No recent plays</p>
          <p className="text-sm text-muted-foreground/70">Start listening to build your history</p>
        </div>
      </section>
    );
  }
  
  return (
    <section className="px-4 py-4">
      <SectionHeader 
        title="Recently Played" 
        subtitle="Jump back in"
      />
      <HorizontalScroll>
        {tracks?.map((track) => (
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
