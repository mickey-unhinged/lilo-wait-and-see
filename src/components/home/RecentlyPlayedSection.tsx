import { useState, useEffect } from "react";
import { SectionHeader } from "./SectionHeader";
import { HorizontalScroll } from "./HorizontalScroll";
import { TrackCard } from "./TrackCard";
import { usePlayer, Track } from "@/contexts/PlayerContext";
import { Clock } from "lucide-react";

const LOCAL_STORAGE_KEY = "lilo-play-history";

interface PlayHistoryEntry {
  track: Track;
  playedAt: string;
}

export function RecentlyPlayedSection() {
  const [recentTracks, setRecentTracks] = useState<Track[]>([]);
  const { currentTrack, isPlaying, playTrack, setQueue } = usePlayer();
  
  // Load play history from localStorage
  useEffect(() => {
    const loadHistory = () => {
      try {
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (stored) {
          const entries: PlayHistoryEntry[] = JSON.parse(stored);
          // Sort by playedAt descending and take top 10
          entries.sort((a, b) => new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime());
          setRecentTracks(entries.slice(0, 10).map(e => e.track));
        }
      } catch (e) {
        console.error("Failed to load play history:", e);
      }
    };

    loadHistory();

    // Listen for storage changes and poll for updates
    const handleStorage = () => loadHistory();
    window.addEventListener("storage", handleStorage);
    
    const interval = setInterval(loadHistory, 2000);
    
    return () => {
      window.removeEventListener("storage", handleStorage);
      clearInterval(interval);
    };
  }, []);
  
  const handleTrackClick = (track: Track) => {
    setQueue(recentTracks);
    playTrack(track, recentTracks);
  };

  if (recentTracks.length === 0) {
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
        {recentTracks.map((track, index) => (
          <TrackCard
            key={`${track.id}-${index}`}
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
