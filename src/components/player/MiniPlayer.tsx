import { Play, Pause, SkipForward, Heart } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

export function MiniPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  
  // Mock data - will be replaced with real state management
  const currentTrack = {
    title: "Midnight Dreams",
    artist: "Luna Echo",
    coverUrl: "https://images.unsplash.com/photo-1614149162883-504ce4d13909?w=100&h=100&fit=crop",
    progress: 35,
  };
  
  return (
    <Link 
      to="/player"
      className="block mx-3 mb-2 glass rounded-2xl overflow-hidden group cursor-pointer hover:bg-card/70 transition-all duration-300"
    >
      {/* Progress bar */}
      <div className="h-0.5 bg-muted/50">
        <div 
          className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-300"
          style={{ width: `${currentTrack.progress}%` }}
        />
      </div>
      
      <div className="flex items-center gap-3 p-3">
        {/* Album art */}
        <div className="relative">
          <img
            src={currentTrack.coverUrl}
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
          <p className="text-xs text-muted-foreground truncate">{currentTrack.artist}</p>
        </div>
        
        {/* Controls */}
        <div className="flex items-center gap-1" onClick={(e) => e.preventDefault()}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsLiked(!isLiked);
            }}
            className={cn(
              "p-2 rounded-full transition-all duration-300",
              isLiked ? "text-accent" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Heart 
              className="w-5 h-5" 
              fill={isLiked ? "currentColor" : "none"}
            />
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsPlaying(!isPlaying);
            }}
            className="p-2 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300 glow-primary"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5" fill="currentColor" />
            ) : (
              <Play className="w-5 h-5 ml-0.5" fill="currentColor" />
            )}
          </button>
          
          <button
            onClick={(e) => e.stopPropagation()}
            className="p-2 rounded-full text-muted-foreground hover:text-foreground transition-colors"
          >
            <SkipForward className="w-5 h-5" />
          </button>
        </div>
      </div>
    </Link>
  );
}
