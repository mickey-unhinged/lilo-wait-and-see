import { Play, Pause, Clock, Music2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePlayer, type Track } from "@/contexts/PlayerContext";

interface SearchResultsProps {
  results: Track[];
  isLoading: boolean;
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function SearchResults({ results, isLoading }: SearchResultsProps) {
  const { currentTrack, isPlaying, playTrack, toggle, setQueue } = usePlayer();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-xl animate-pulse">
            <div className="w-14 h-14 bg-muted rounded-lg" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (results.length === 0) {
    return null;
  }

  const handlePlay = (track: Track) => {
    if (currentTrack?.id === track.id) {
      toggle();
    } else {
      setQueue(results);
      playTrack(track, results);
    }
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 mb-4">
        <Music2 className="w-5 h-5 text-primary" />
        <h3 className="font-semibold">Songs</h3>
        <span className="text-sm text-muted-foreground">({results.length})</span>
      </div>

      {results.map((track, index) => {
        const isCurrentTrack = currentTrack?.id === track.id;
        const isTrackPlaying = isCurrentTrack && isPlaying;

        return (
          <button
            key={track.id}
            onClick={() => handlePlay(track)}
            className={cn(
              "w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group",
              isCurrentTrack ? "bg-primary/10" : "hover:bg-card/50"
            )}
          >
            {/* Index/Play indicator */}
            <div className="w-6 text-center">
              <span className={cn(
                "text-sm text-muted-foreground group-hover:hidden",
                isCurrentTrack && "text-primary font-medium"
              )}>
                {isTrackPlaying ? (
                  <div className="flex items-center justify-center gap-0.5">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="w-0.5 bg-primary rounded-full animate-wave"
                        style={{ height: "12px", animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                ) : (
                  index + 1
                )}
              </span>
              <span className="hidden group-hover:block">
                {isTrackPlaying ? (
                  <Pause className="w-4 h-4 text-primary mx-auto" fill="currentColor" />
                ) : (
                  <Play className="w-4 h-4 text-primary mx-auto ml-0.5" fill="currentColor" />
                )}
              </span>
            </div>

            {/* Album art */}
            <div className="w-12 h-12 rounded-lg overflow-hidden bg-card flex-shrink-0">
              {(() => {
                const coverUrl = track.cover_url || track.album_cover;
                const fallbackUrl = "https://images.unsplash.com/photo-1614149162883-504ce4d13909?w=100&h=100&fit=crop";
                
                if (!coverUrl) {
                  console.warn(`Track "${track.title}" missing cover - cover_url: ${track.cover_url}, album_cover: ${track.album_cover}`);
                }
                
                return (
                  <img
                    src={coverUrl || fallbackUrl}
                    alt={track.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      if (target.src !== fallbackUrl) {
                        console.error(`Image failed to load: ${target.src}, falling back to default`);
                        target.src = fallbackUrl;
                      }
                    }}
                  />
                );
              })()}
            </div>

            {/* Track info */}
            <div className="flex-1 min-w-0 text-left">
              <p className={cn(
                "font-medium text-sm truncate",
                isCurrentTrack && "text-primary"
              )}>
                {track.title}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {track.artist_name} • {track.album_title}
              </p>
            </div>

            {/* Duration */}
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>{formatDuration(track.duration_ms)}</span>
            </div>

            {/* Source badge */}
            {track.id.startsWith("ytm-") ? (
              <span className="px-2 py-0.5 text-[10px] font-medium bg-red-500/20 text-red-400 rounded-full">
                Live
              </span>
            ) : track.id.startsWith("itunes-") ? (
              <span className="px-2 py-0.5 text-[10px] font-medium bg-secondary/50 rounded-full">
                Preview
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
