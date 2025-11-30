import { Play, Pause, SkipForward, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { usePlayer } from "@/contexts/PlayerContext";
import { useLikedSongs } from "@/hooks/useLikedSongs";
import { useToast } from "@/hooks/use-toast";

export function MiniPlayer() {
  const { currentTrack, isPlaying, progress, duration, toggle, next, isLoading } = usePlayer();
  const { isLiked, toggleLike } = useLikedSongs();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // Don't render if no track
  if (!currentTrack) return null;
  
  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;
  const coverUrl = currentTrack.cover_url || currentTrack.album_cover || "https://images.unsplash.com/photo-1614149162883-504ce4d13909?w=100&h=100&fit=crop";
  const trackIsLiked = isLiked(currentTrack.id);

  const handleLikeToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const newState = await toggleLike(currentTrack);
    toast({
      title: newState ? "Added to Liked Songs" : "Removed from Liked Songs",
      description: currentTrack.title,
    });
  };
  
  return (
    <div
      onClick={() => navigate("/player")}
      className="block mx-3 mb-2 glass rounded-2xl overflow-hidden group cursor-pointer hover:bg-card/70 transition-all duration-300"
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          navigate("/player");
        }
      }}
    >
      {/* Progress bar */}
      <div className="h-0.5 bg-muted/50">
        <div 
          className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      
      <div className="flex items-center gap-3 p-3">
        {/* Album art */}
        <div className="relative">
          <img
            src={coverUrl}
            alt={currentTrack.title}
            className="w-12 h-12 rounded-xl object-cover"
          />
          <div className={cn(
            "absolute inset-0 rounded-xl transition-opacity duration-300",
            isPlaying ? "opacity-100" : "opacity-0"
          )}>
            <div className="absolute inset-0 bg-primary/20 rounded-xl animate-pulse-glow" />
          </div>
        </div>
        
        {/* Track info */}
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm truncate">{currentTrack.title}</h4>
          <p className="text-xs text-muted-foreground truncate">{currentTrack.artist_name}</p>
        </div>
        
        {/* Controls */}
        <div
          className="flex items-center gap-1"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <button
            onClick={handleLikeToggle}
            className={cn(
              "p-2 rounded-full transition-all duration-300",
              trackIsLiked ? "text-accent" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Heart 
              className="w-5 h-5" 
              fill={trackIsLiked ? "currentColor" : "none"}
            />
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggle();
            }}
            disabled={isLoading}
            className={cn(
              "p-2 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300 glow-primary",
              isLoading && "opacity-70"
            )}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5" fill="currentColor" />
            ) : (
              <Play className="w-5 h-5 ml-0.5" fill="currentColor" />
            )}
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              next();
            }}
            className="p-2 rounded-full text-muted-foreground hover:text-foreground transition-colors"
          >
            <SkipForward className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
