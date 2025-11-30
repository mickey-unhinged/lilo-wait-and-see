import { useState, useEffect } from "react";
import { Sparkles, Play, Loader2 } from "lucide-react";
import { SectionHeader } from "./SectionHeader";
import { HorizontalScroll } from "./HorizontalScroll";
import { usePlayer, type Track } from "@/contexts/PlayerContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export function DiscoverWeeklySection() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { playTrack, currentTrack, isPlaying, setQueue } = usePlayer();

  useEffect(() => {
    const fetchDiscoverWeekly = async () => {
      setIsLoading(true);
      try {
        // Get user's listening history for personalization
        const stored = localStorage.getItem("lilo-play-history");
        const history = stored ? JSON.parse(stored) : [];
        
        // Extract unique artists from play history
        const artists = [...new Set(history.map((e: any) => e.track?.artist_name).filter(Boolean))];
        
        // Generate weekly seed based on week number
        const weekNumber = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
        
        const { data, error } = await supabase.functions.invoke("trending-suggestions", {
          body: {
            type: "discover-weekly",
            seedArtists: artists.slice(0, 5),
            weekSeed: weekNumber,
            limit: 25,
          },
        });

        if (error) throw error;
        setTracks(data?.tracks || []);
      } catch (err) {
        console.error("Failed to fetch Discover Weekly:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDiscoverWeekly();
  }, []);

  const handlePlayAll = () => {
    if (tracks.length > 0) {
      setQueue(tracks);
      playTrack(tracks[0], tracks);
    }
  };

  const handlePlayTrack = (track: Track) => {
    setQueue(tracks);
    playTrack(track, tracks);
  };

  if (isLoading) {
    return (
      <section className="py-4">
        <SectionHeader title="Discover Weekly" />
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </section>
    );
  }

  if (tracks.length === 0) return null;

  return (
    <section className="py-4">
      <div className="flex items-center justify-between mb-4 px-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Discover Weekly</h2>
            <p className="text-xs text-muted-foreground">Personalized for you • Updated weekly</p>
          </div>
        </div>
        <button
          onClick={handlePlayAll}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-full text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Play className="w-4 h-4" fill="currentColor" />
          Play all
        </button>
      </div>

      <HorizontalScroll>
        {tracks.slice(0, 10).map((track, index) => {
          const isCurrentTrack = currentTrack?.id === track.id;
          const isTrackPlaying = isCurrentTrack && isPlaying;

          return (
            <button
              key={track.id}
              onClick={() => handlePlayTrack(track)}
              className="group flex-shrink-0 w-36"
            >
              <div className={cn(
                "relative aspect-square rounded-xl overflow-hidden mb-2",
                "bg-card transition-transform duration-300 group-hover:scale-105"
              )}>
                <img
                  src={track.cover_url || track.album_cover || "https://images.unsplash.com/photo-1614149162883-504ce4d13909?w=200&h=200&fit=crop"}
                  alt={track.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className={cn(
                  "absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity",
                  isTrackPlaying ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                )}>
                  {isTrackPlaying ? (
                    <div className="flex items-center gap-1">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="w-1 bg-primary rounded-full animate-wave"
                          style={{ height: "16px", animationDelay: `${i * 0.15}s` }}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
                      <Play className="w-5 h-5 text-primary-foreground ml-0.5" fill="currentColor" />
                    </div>
                  )}
                </div>
                <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center text-xs font-bold text-white">
                  {index + 1}
                </div>
              </div>
              <p className={cn(
                "text-sm font-medium truncate",
                isCurrentTrack && "text-primary"
              )}>
                {track.title}
              </p>
              <p className="text-xs text-muted-foreground truncate">{track.artist_name}</p>
            </button>
          );
        })}
      </HorizontalScroll>
    </section>
  );
}
