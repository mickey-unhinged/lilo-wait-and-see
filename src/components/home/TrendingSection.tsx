import { useState, useEffect } from "react";
import { SectionHeader } from "./SectionHeader";
import { HorizontalScroll } from "./HorizontalScroll";
import { TrackCard } from "./TrackCard";
import { usePlayer, Track } from "@/contexts/PlayerContext";
import { Music, TrendingUp } from "lucide-react";

const LOCAL_STORAGE_KEY = "lilo-play-history";

interface PlayHistoryEntry {
  track: Track;
  playedAt: string;
}

// Count plays per track from history
function getPlayCounts(entries: PlayHistoryEntry[]): Map<string, { count: number; track: Track }> {
  const counts = new Map<string, { count: number; track: Track }>();
  
  for (const entry of entries) {
    const existing = counts.get(entry.track.id);
    if (existing) {
      existing.count++;
    } else {
      counts.set(entry.track.id, { count: 1, track: entry.track });
    }
  }
  
  return counts;
}

export function TrendingSection() {
  const [trendingTracks, setTrendingTracks] = useState<Track[]>([]);
  const { currentTrack, isPlaying, playTrack, setQueue } = usePlayer();
  
  // Load trending from play history (most played tracks)
  useEffect(() => {
    const loadTrending = () => {
      try {
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (stored) {
          const entries: PlayHistoryEntry[] = JSON.parse(stored);
          const playCounts = getPlayCounts(entries);
          
          // Sort by play count descending
          const sorted = Array.from(playCounts.values())
            .sort((a, b) => b.count - a.count)
            .slice(0, 10)
            .map(item => item.track);
          
          setTrendingTracks(sorted);
        }
      } catch (e) {
        console.error("Failed to load trending:", e);
      }
    };

    loadTrending();

    // Listen for storage changes and poll for updates
    const handleStorage = () => loadTrending();
    window.addEventListener("storage", handleStorage);
    
    const interval = setInterval(loadTrending, 3000);
    
    return () => {
      window.removeEventListener("storage", handleStorage);
      clearInterval(interval);
    };
  }, []);
  
  const handleTrackClick = (track: Track) => {
    setQueue(trendingTracks);
    playTrack(track, trendingTracks);
  };

  if (trendingTracks.length === 0) {
    return (
      <section className="px-4 py-4">
        <SectionHeader 
          title="Trending Now" 
          subtitle="Your most played"
        />
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-card/50 flex items-center justify-center mb-4">
            <Music className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">No trending tracks yet</p>
          <p className="text-sm text-muted-foreground/70">Play some music to see your trends</p>
        </div>
      </section>
    );
  }
  
  return (
    <section className="px-4 py-4">
      <SectionHeader 
        title="Trending Now" 
        subtitle="Your most played"
      />
      <HorizontalScroll>
        {trendingTracks.map((track, index) => (
          <TrackCard
            key={`${track.id}-${index}`}
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
