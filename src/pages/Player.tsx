import { useState, useEffect } from "react";
import { ChevronDown, MoreHorizontal, Heart, Share2, Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, ListMusic, Volume2 } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";

const Player = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<"off" | "all" | "one">("off");
  const [progress, setProgress] = useState(35);
  const [volume, setVolume] = useState(80);
  
  // Mock track data
  const currentTrack = {
    title: "Midnight Dreams",
    artist: "Luna Echo",
    album: "Ethereal Nights",
    coverUrl: "https://images.unsplash.com/photo-1614149162883-504ce4d13909?w=600&h=600&fit=crop",
    duration: "3:42",
    currentTime: "1:18",
    dominantColor: "280 100% 65%", // Purple
  };

  // Animated bars for visualizer
  const [bars, setBars] = useState<number[]>(Array(40).fill(0.5));
  
  useEffect(() => {
    if (!isPlaying) return;
    
    const interval = setInterval(() => {
      setBars(prev => prev.map(() => 0.2 + Math.random() * 0.8));
    }, 100);
    
    return () => clearInterval(interval);
  }, [isPlaying]);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Ambient background effect */}
      <div 
        className="absolute inset-0 opacity-30 transition-all duration-1000"
        style={{
          background: `radial-gradient(ellipse at 50% 0%, hsl(${currentTrack.dominantColor} / 0.4) 0%, transparent 60%),
                       radial-gradient(ellipse at 80% 100%, hsl(320 100% 60% / 0.2) 0%, transparent 50%),
                       radial-gradient(ellipse at 20% 80%, hsl(185 100% 50% / 0.15) 0%, transparent 50%)`
        }}
      />
      
      {/* Content */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header */}
        <header className="flex items-center justify-between p-4">
          <Link to="/" className="p-2 -m-2">
            <ChevronDown className="w-6 h-6" />
          </Link>
          <div className="text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Playing from</p>
            <p className="text-sm font-medium">{currentTrack.album}</p>
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
                boxShadow: `0 0 100px 20px hsl(${currentTrack.dominantColor} / 0.3)`
              }}
            />
            
            {/* Album cover */}
            <img
              src={currentTrack.coverUrl}
              alt={currentTrack.title}
              className="relative w-full h-full object-cover rounded-3xl shadow-2xl"
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
              <h1 className="text-2xl font-bold font-display truncate">{currentTrack.title}</h1>
              <p className="text-muted-foreground truncate">{currentTrack.artist}</p>
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
            value={[progress]}
            onValueChange={([value]) => setProgress(value)}
            max={100}
            step={1}
            className="w-full"
          />
          <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
            <span>{currentTrack.currentTime}</span>
            <span>{currentTrack.duration}</span>
          </div>
        </div>
        
        {/* Main controls */}
        <div className="flex items-center justify-center gap-6 px-8 mb-6">
          <button
            onClick={() => setIsShuffle(!isShuffle)}
            className={cn(
              "p-2 transition-colors",
              isShuffle ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Shuffle className="w-5 h-5" />
          </button>
          
          <button className="p-2 text-foreground hover:text-primary transition-colors">
            <SkipBack className="w-7 h-7" fill="currentColor" />
          </button>
          
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg glow-primary hover:scale-105 transition-transform"
          >
            {isPlaying ? (
              <Pause className="w-7 h-7" fill="currentColor" />
            ) : (
              <Play className="w-7 h-7 ml-1" fill="currentColor" />
            )}
          </button>
          
          <button className="p-2 text-foreground hover:text-primary transition-colors">
            <SkipForward className="w-7 h-7" fill="currentColor" />
          </button>
          
          <button
            onClick={() => {
              const modes: ("off" | "all" | "one")[] = ["off", "all", "one"];
              const currentIndex = modes.indexOf(repeatMode);
              setRepeatMode(modes[(currentIndex + 1) % 3]);
            }}
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
              value={[volume]}
              onValueChange={([value]) => setVolume(value)}
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
