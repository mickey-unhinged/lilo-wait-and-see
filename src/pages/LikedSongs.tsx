import { ChevronLeft, Play, Pause, Heart, Shuffle, Music } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { usePlayer } from "@/contexts/PlayerContext";
import { useLikedSongs } from "@/hooks/useLikedSongs";
import type { Track } from "@/contexts/PlayerContext";
import { cn } from "@/lib/utils";
import { Watermark } from "@/components/common/Watermark";
import { useToast } from "@/hooks/use-toast";

const LikedSongs = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentTrack, isPlaying, playTrack, setQueue, toggle } = usePlayer();
  const { likedTracks, toggleLike, isLoading } = useLikedSongs();

  const handlePlayAll = () => {
    if (likedTracks.length > 0) {
      setQueue(likedTracks);
      playTrack(likedTracks[0], likedTracks);
    }
  };

  const handleTrackClick = (track: Track) => {
    setQueue(likedTracks);
    playTrack(track, likedTracks);
  };

  const handleUnlike = async (e: React.MouseEvent, track: Track) => {
    e.stopPropagation();
    await toggleLike(track);
    toast({
      title: "Removed from Liked Songs",
      description: track.title,
    });
  };

  const formatDuration = (ms: number) => {
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const isCurrentlyPlaying = currentTrack && likedTracks.some(t => t.id === currentTrack.id) && isPlaying;

  return (
    <AppLayout showPlayer={false}>
      <div className="min-h-screen">
        {/* Header with gradient */}
        <div className="relative h-64 gradient-bg">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background" />
          
          <div className="relative z-10 p-4 pt-12">
            <button 
              onClick={() => navigate(-1)}
              className="p-2 -ml-2 rounded-full hover:bg-background/20 transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          </div>
          
          <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
            <div className="flex items-end gap-4">
              <div className="w-24 h-24 rounded-2xl gradient-bg flex items-center justify-center shadow-lg">
                <Heart className="w-12 h-12 text-primary-foreground" fill="currentColor" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-primary-foreground/70">Playlist</p>
                <h1 className="text-3xl font-bold font-display">Liked Songs</h1>
                <p className="text-sm text-primary-foreground/70 mt-1">{likedTracks.length} songs</p>
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4 px-6 py-4">
          <button
            onClick={handlePlayAll}
            disabled={likedTracks.length === 0}
            className="w-14 h-14 rounded-full gradient-bg flex items-center justify-center shadow-lg glow-primary disabled:opacity-50"
          >
            {isCurrentlyPlaying ? (
              <Pause className="w-6 h-6 text-primary-foreground" fill="currentColor" />
            ) : (
              <Play className="w-6 h-6 text-primary-foreground ml-1" fill="currentColor" />
            )}
          </button>
          <button className="p-3 rounded-full hover:bg-card transition-colors">
            <Shuffle className="w-6 h-6 text-muted-foreground" />
          </button>
        </div>

        {/* Track list */}
        <div className="px-4 pb-32">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex items-center gap-3 p-3 animate-pulse">
                  <div className="w-12 h-12 rounded-lg bg-card" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-card rounded w-3/4" />
                    <div className="h-3 bg-card rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : likedTracks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-20 h-20 rounded-full bg-card/50 flex items-center justify-center mb-4">
                <Music className="w-10 h-10 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold mb-2">No liked songs yet</h2>
              <p className="text-muted-foreground mb-6">Start liking songs to see them here</p>
              <button 
                onClick={() => navigate("/search")}
                className="px-6 py-3 rounded-full gradient-bg text-primary-foreground font-medium"
              >
                Discover Music
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              {likedTracks.map((track, index) => (
                <button
                  key={track.id}
                  onClick={() => handleTrackClick(track)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-xl hover:bg-card/50 transition-colors",
                    currentTrack?.id === track.id && "bg-card/50"
                  )}
                >
                  <span className="w-6 text-sm text-muted-foreground">{index + 1}</span>
                  <img 
                    src={track.cover_url || track.album_cover || "https://images.unsplash.com/photo-1614149162883-504ce4d13909?w=100&h=100&fit=crop"}
                    alt={track.title}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                  <div className="flex-1 min-w-0 text-left">
                    <p className={cn(
                      "font-medium truncate",
                      currentTrack?.id === track.id && "text-primary"
                    )}>
                      {track.title}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">{track.artist_name}</p>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {formatDuration(track.duration_ms)}
                  </span>
                  <button
                    onClick={(e) => handleUnlike(e, track)}
                    className="p-2 text-accent hover:scale-110 transition-transform"
                  >
                    <Heart className="w-5 h-5" fill="currentColor" />
                  </button>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Watermark */}
        <div className="fixed bottom-20 left-0 right-0 flex justify-center pointer-events-none">
          <Watermark variant="subtle" />
        </div>
      </div>
    </AppLayout>
  );
};

export default LikedSongs;
