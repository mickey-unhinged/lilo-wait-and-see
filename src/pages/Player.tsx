import { useState, useEffect } from "react";
import { ChevronDown, MoreHorizontal, Heart, Share2, Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, ListMusic, Volume2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import { usePlayer } from "@/contexts/PlayerContext";
import { demoTracks } from "@/hooks/useTracks";

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

const Player = () => {
  const navigate = useNavigate();
  const {
    currentTrack,
    isPlaying,
    progress,
    duration,
    volume,
    isShuffle,
    repeatMode,
    isLoading,
    toggle,
    next,
    previous,
    seek,
    setVolume,
    toggleShuffle,
    toggleRepeat,
    playTrack,
    setQueue,
  } = usePlayer();
  
  const [isLiked, setIsLiked] = useState(false);
  const [bars, setBars] = useState<number[]>(Array(40).fill(0.5));
  
  // Auto-play first demo track if no track is loaded
  useEffect(() => {
    if (!currentTrack && demoTracks.length > 0) {
      setQueue(demoTracks);
      playTrack(demoTracks[0], demoTracks);
    }
  }, [currentTrack, playTrack, setQueue]);
  
  // Animated visualizer bars
  useEffect(() => {
    if (!isPlaying) return;
    
    const interval = setInterval(() => {
      setBars(prev => prev.map(() => 0.2 + Math.random() * 0.8));
    }, 100);
    
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Fallback track for display
  const track = currentTrack || demoTracks[0];
  const coverUrl = track?.cover_url || track?.album_cover || "https://images.unsplash.com/photo-1614149162883-504ce4d13909?w=600&h=600&fit=crop";
  const dominantColor = "280 100% 65%";
  
  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Ambient background effect */}
      <div 
        className="absolute inset-0 opacity-30 transition-all duration-1000"
        style={{
          background: `radial-gradient(ellipse at 50% 0%, hsl(${dominantColor} / 0.4) 0%, transparent 60%),
                       radial-gradient(ellipse at 80% 100%, hsl(320 100% 60% / 0.2) 0%, transparent 50%),
                       radial-gradient(ellipse at 20% 80%, hsl(185 100% 50% / 0.15) 0%, transparent 50%)`
        }}
      />
      
      {/* Content */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header */}
        <header className="flex items-center justify-between p-4">
          <button onClick={() => navigate(-1)} className="p-2 -m-2">
            <ChevronDown className="w-6 h-6" />
          </button>
          <div className="text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Playing from</p>
            <p className="text-sm font-medium">{track?.album_title || "Your Library"}</p>
          </div>
          <button className="p-2 -m-2">
            <MoreHorizontal className="w-6 h-6" />
          </button>
        </header>
        
        {/* Album art with visualizer */}
        <div className="flex-1 flex items-center justify-center px-8 py-6">
          <div className="relative w-full max-w-sm aspect-square">
            {/* Glow effect */}
            <div 
              className={cn(
                "absolute inset-0 rounded-3xl transition-opacity duration-500",
                isPlaying ? "opacity-100" : "opacity-50"
              )}
              style={{
                boxShadow: `0 0 100px 20px hsl(${dominantColor} / 0.3)`
              }}
            />
            
            {/* Album cover */}
            <img
              src={coverUrl}
              alt={track?.title || "Album art"}
              className={cn(
                "relative w-full h-full object-cover rounded-3xl shadow-2xl transition-all duration-500",
                isLoading && "animate-pulse"
              )}
            />
            
            {/* Visualizer overlay */}
            {isPlaying && (
              <div className="absolute inset-x-0 bottom-0 h-24 flex items-end justify-center gap-0.5 px-6 pb-4">
                {bars.map((height, i) => (
                  <div
                    key={i}
                    className="w-1 bg-white/60 rounded-full transition-all duration-100"
                    style={{ height: `${height * 100}%` }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Track info */}
        <div className="px-8 mb-6">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold font-display truncate">{track?.title || "No Track"}</h1>
              <p className="text-muted-foreground truncate">{track?.artist_name || "Unknown Artist"}</p>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <button
                onClick={() => setIsLiked(!isLiked)}
                className={cn(
                  "p-2 rounded-full transition-all duration-300",
                  isLiked ? "text-accent" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Heart className="w-6 h-6" fill={isLiked ? "currentColor" : "none"} />
              </button>
              <button className="p-2 rounded-full text-muted-foreground hover:text-foreground transition-colors">
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="px-8 mb-4">
          <Slider
            value={[progressPercent]}
            onValueChange={([value]) => {
              const newTime = (value / 100) * duration;
              seek(newTime);
            }}
            max={100}
            step={0.1}
            className="w-full"
          />
          <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
            <span>{formatTime(progress)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
        
        {/* Main controls */}
        <div className="flex items-center justify-center gap-6 px-8 mb-6">
          <button
            onClick={toggleShuffle}
            className={cn(
              "p-2 transition-colors",
              isShuffle ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Shuffle className="w-5 h-5" />
          </button>
          
          <button 
            onClick={previous}
            className="p-2 text-foreground hover:text-primary transition-colors"
          >
            <SkipBack className="w-7 h-7" fill="currentColor" />
          </button>
          
          <button
            onClick={toggle}
            disabled={isLoading}
            className={cn(
              "w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg glow-primary hover:scale-105 transition-transform",
              isLoading && "opacity-70"
            )}
          >
            {isPlaying ? (
              <Pause className="w-7 h-7" fill="currentColor" />
            ) : (
              <Play className="w-7 h-7 ml-1" fill="currentColor" />
            )}
          </button>
          
          <button 
            onClick={next}
            className="p-2 text-foreground hover:text-primary transition-colors"
          >
            <SkipForward className="w-7 h-7" fill="currentColor" />
          </button>
          
          <button
            onClick={toggleRepeat}
            className={cn(
              "p-2 relative transition-colors",
              repeatMode !== "off" ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Repeat className="w-5 h-5" />
            {repeatMode === "one" && (
              <span className="absolute -top-1 -right-1 text-[10px] font-bold text-primary">1</span>
            )}
          </button>
        </div>
        
        {/* Bottom controls */}
        <div className="flex items-center justify-between px-8 pb-8">
          <button className="p-2 text-muted-foreground hover:text-foreground transition-colors">
            <ListMusic className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-2 w-32">
            <Volume2 className="w-4 h-4 text-muted-foreground" />
            <Slider
              value={[volume * 100]}
              onValueChange={([value]) => setVolume(value / 100)}
              max={100}
              step={1}
              className="flex-1"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Player;
