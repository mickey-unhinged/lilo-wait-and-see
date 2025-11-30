import { useState, useEffect } from "react";
import { ChevronDown, MoreHorizontal, Heart, Share2, Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Volume2, Music2, Video, PlusCircle, Radio, User, Flag, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import { usePlayer, Track } from "@/contexts/PlayerContext";
import { demoTracks } from "@/hooks/useTracks";
import { useLikedSongs } from "@/hooks/useLikedSongs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LyricsPanel } from "@/components/player/LyricsPanel";
import { SyncedVideoPlayer } from "@/components/player/SyncedVideoPlayer";
import { useToast } from "@/hooks/use-toast";
import { Watermark } from "@/components/common/Watermark";
import { ShareToFriendsSheet } from "@/components/inbox/ShareToFriendsSheet";
import { AddToPlaylistSheet } from "@/components/playlist/AddToPlaylistSheet";
import { QueueManager } from "@/components/player/QueueManager";
import { DownloadButton } from "@/components/player/DownloadButton";
import { supabase } from "@/integrations/supabase/client";

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

const Player = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    currentTrack,
    isPlaying,
    progress,
    duration,
    volume,
    isShuffle,
    repeatMode,
    isLoading,
    queue,
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
  
  const { isLiked, toggleLike } = useLikedSongs();
  const [bars, setBars] = useState<number[]>(Array(40).fill(0.5));
  const [showLyrics, setShowLyrics] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [showAddToPlaylist, setShowAddToPlaylist] = useState(false);
  const [isStartingRadio, setIsStartingRadio] = useState(false);
  
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
  const trackIsLiked = track ? isLiked(track.id) : false;

  const handleLikeToggle = async () => {
    if (track) {
      const newState = await toggleLike(track);
      toast({
        title: newState ? "Added to Liked Songs" : "Removed from Liked Songs",
        description: track.title,
      });
    }
  };

  const handleShare = () => {
    setShowShareSheet(true);
  };

  const handleAddToPlaylist = () => {
    setShowAddToPlaylist(true);
  };

  const handleGoToArtist = () => {
    if (!track?.artist_name) {
      toast({ title: "Artist unavailable", description: "We couldn't find artist info for this track.", variant: "destructive" });
      return;
    }
    const slug = encodeURIComponent(track.artist_name);
    navigate(`/artist/${slug}`);
  };

  const handleStartRadio = async () => {
    if (!track?.artist_name) {
      toast({ title: "Radio unavailable", description: "Play a catalog track to start radio.", variant: "destructive" });
      return;
    }

    setIsStartingRadio(true);
    try {
      const { data, error } = await supabase.functions.invoke("trending-suggestions", {
        body: { type: "personalized", seedArtists: [track.artist_name], limit: 25 },
      });
      if (error) throw error;
      const suggestions: Track[] = data?.tracks || [];
      if (suggestions.length === 0) {
        toast({ title: "Radio unavailable", description: "Try again in a moment.", variant: "destructive" });
        return;
      }
      setQueue(suggestions);
      playTrack(suggestions[0], suggestions);
      toast({ title: `${track.artist_name} Radio`, description: "We queued up fresh recommendations." });
    } catch (error) {
      console.error("Failed to start radio:", error);
      toast({ title: "Radio unavailable", description: "Please try again later.", variant: "destructive" });
    } finally {
      setIsStartingRadio(false);
    }
  };

  const handleReportIssue = () => {
    const subject = encodeURIComponent("Player feedback");
    const body = encodeURIComponent(`Issue while playing "${track?.title || "Unknown"}" by ${track?.artist_name || "Unknown Artist"}.\n\nDescribe the issue here:`);
    window.open(`mailto:support@lilo.app?subject=${subject}&body=${body}`, "_blank");
  };

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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 -m-2">
                <MoreHorizontal className="w-6 h-6" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={handleLikeToggle}>
                <Heart className="w-4 h-4 mr-2" fill={trackIsLiked ? "currentColor" : "none"} />
                {trackIsLiked ? "Remove from Liked" : "Add to Liked Songs"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleAddToPlaylist}>
                <PlusCircle className="w-4 h-4 mr-2" />
                Add to Playlist
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleGoToArtist}>
                <User className="w-4 h-4 mr-2" />
                Go to Artist
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleStartRadio} disabled={isStartingRadio}>
                <Radio className="w-4 h-4 mr-2" />
                {isStartingRadio ? "Starting…" : "Start Radio"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleShare}>
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <div className="flex items-center px-2 py-1.5">
                  <Download className="w-4 h-4 mr-2" />
                  <span className="flex-1">Download</span>
                  {track && <DownloadButton track={track} size="sm" className="ml-auto" />}
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleReportIssue}>
                <Flag className="w-4 h-4 mr-2" />
                Report Issue
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        
        {/* Album art with visualizer, lyrics or video side by side */}
        <div className="flex-1 flex items-center justify-center px-4 py-6">
          <div className={cn(
            "flex items-center justify-center gap-4 w-full max-w-4xl transition-all duration-300",
            (showLyrics || showVideo) ? "flex-row" : "flex-col"
          )}>
            {/* Album art container */}
            <div className={cn(
              "relative transition-all duration-300",
              (showLyrics || showVideo) ? "w-48 h-48 md:w-64 md:h-64 flex-shrink-0" : "w-full max-w-sm aspect-square"
            )}>
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
              {isPlaying && !showLyrics && !showVideo && (
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

            {/* Lyrics panel - shown inline when active */}
            {showLyrics && (
              <div className="flex-1 h-64 md:h-80 lg:h-96 min-w-0 bg-card/30 rounded-2xl backdrop-blur-sm border border-border/20 overflow-hidden">
                <LyricsPanel title={track?.title} artist={track?.artist_name} />
              </div>
            )}

            {/* Video panel - shown inline when active */}
            {showVideo && (
              <div className="flex-1 h-64 md:h-80 lg:h-96 min-w-0 bg-card/30 rounded-2xl backdrop-blur-sm border border-border/20 overflow-hidden p-4">
                <SyncedVideoPlayer videoId={track?.videoId} title={track?.title} />
              </div>
            )}
          </div>
        </div>
        
        {/* Track info with action buttons */}
        <div className="px-8 mb-6">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold font-display truncate">{track?.title || "No Track"}</h1>
              <p className="text-muted-foreground truncate">{track?.artist_name || "Unknown Artist"}</p>
            </div>
            <div className="flex items-center gap-1 ml-4">
              <button
                onClick={handleLikeToggle}
                className={cn(
                  "p-2 rounded-full transition-all duration-300",
                  trackIsLiked ? "text-accent" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Heart className="w-6 h-6" fill={trackIsLiked ? "currentColor" : "none"} />
              </button>
            </div>
          </div>
          
          {/* Lyrics & Video buttons */}
          <div className="flex items-center gap-2 mt-4">
            <button 
              onClick={() => {
                setShowLyrics(!showLyrics);
                if (!showLyrics) setShowVideo(false);
              }}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors",
                showLyrics 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted/40 hover:bg-muted/60"
              )}
            >
              <Music2 className="w-4 h-4" />
              Lyrics
            </button>
            
            {track?.videoId && (
              <button 
                onClick={() => {
                  setShowVideo(!showVideo);
                  if (!showVideo) setShowLyrics(false);
                }}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors",
                  showVideo 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted/40 hover:bg-muted/60"
                )}
              >
                <Video className="w-4 h-4" />
                Video
              </button>
            )}
            
            <button 
              onClick={handleShare}
              className="p-2 rounded-full text-muted-foreground hover:text-foreground transition-colors ml-auto"
            >
              <Share2 className="w-5 h-5" />
            </button>
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
        <div className="flex items-center justify-between px-8 pb-4">
          <QueueManager />
          
          <div className="flex items-center gap-2 w-32">
            <Volume2 className="w-4 h-4 text-muted-foreground" />
            <Slider
              value={[volume * 100]}
              onValueChange={([value]) => {
                const newVolume = Math.max(0, Math.min(1, value / 100));
                setVolume(newVolume);
              }}
              max={100}
              step={1}
              className="flex-1"
            />
          </div>
        </div>

        {/* Watermark */}
        <div className="text-center pb-4">
          <Watermark variant="subtle" />
        </div>
      </div>

      {/* Share to Friends Sheet */}
      <ShareToFriendsSheet
        isOpen={showShareSheet}
        onClose={() => setShowShareSheet(false)}
        track={track}
      />

      {/* Add to Playlist Sheet */}
      <AddToPlaylistSheet
        isOpen={showAddToPlaylist}
        onClose={() => setShowAddToPlaylist(false)}
        track={track}
      />
    </div>
  );
};

export default Player;
