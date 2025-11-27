import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Play, Shuffle, Heart, MoreHorizontal, Clock } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { usePlayer, Track } from "@/contexts/PlayerContext";
import { cn } from "@/lib/utils";

// Mock playlist data - in a real app this would come from Supabase
const playlistsData: Record<string, { title: string; description: string; cover: string; tracks: Track[] }> = {
  "liked": {
    title: "Liked Songs",
    description: "Your favorite tracks",
    cover: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400&h=400&fit=crop",
    tracks: [
      { id: "l1", title: "Blinding Lights", artist_id: "1", artist_name: "The Weeknd", duration_ms: 200000, cover_url: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200&h=200&fit=crop" },
      { id: "l2", title: "Levitating", artist_id: "2", artist_name: "Dua Lipa", duration_ms: 203000, cover_url: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=200&h=200&fit=crop" },
      { id: "l3", title: "Stay", artist_id: "3", artist_name: "Kid Laroi & Justin Bieber", duration_ms: 141000, cover_url: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=200&h=200&fit=crop" },
      { id: "l4", title: "Good 4 U", artist_id: "4", artist_name: "Olivia Rodrigo", duration_ms: 178000, cover_url: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=200&h=200&fit=crop" },
    ],
  },
  "1": {
    title: "Liked Songs",
    description: "Your favorite tracks",
    cover: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400&h=400&fit=crop",
    tracks: [
      { id: "l1", title: "Blinding Lights", artist_id: "1", artist_name: "The Weeknd", duration_ms: 200000, cover_url: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200&h=200&fit=crop" },
      { id: "l2", title: "Levitating", artist_id: "2", artist_name: "Dua Lipa", duration_ms: 203000, cover_url: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=200&h=200&fit=crop" },
    ],
  },
  "2": {
    title: "Chill Vibes",
    description: "Relaxing tunes for any mood",
    cover: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400&h=400&fit=crop",
    tracks: [
      { id: "c1", title: "Sunset Dreams", artist_id: "5", artist_name: "Luna Echo", duration_ms: 245000, cover_url: "https://images.unsplash.com/photo-1614149162883-504ce4d13909?w=200&h=200&fit=crop" },
      { id: "c2", title: "Ocean Waves", artist_id: "6", artist_name: "Neon Dreams", duration_ms: 312000, cover_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop" },
      { id: "c3", title: "Midnight Jazz", artist_id: "7", artist_name: "Smooth Collective", duration_ms: 287000, cover_url: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200&h=200&fit=crop" },
    ],
  },
  "3": {
    title: "Night Drive",
    description: "Perfect for late night cruises",
    cover: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&h=400&fit=crop",
    tracks: [
      { id: "n1", title: "Starboy", artist_id: "1", artist_name: "The Weeknd", duration_ms: 230000, cover_url: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=200&h=200&fit=crop" },
      { id: "n2", title: "Drive", artist_id: "8", artist_name: "Nightcrawler", duration_ms: 198000, cover_url: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=200&h=200&fit=crop" },
    ],
  },
  "4": {
    title: "Workout Mix",
    description: "Get pumped with these tracks",
    cover: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=400&fit=crop",
    tracks: [
      { id: "w1", title: "Stronger", artist_id: "9", artist_name: "Kanye West", duration_ms: 312000, cover_url: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=200&h=200&fit=crop" },
      { id: "w2", title: "Eye of the Tiger", artist_id: "10", artist_name: "Survivor", duration_ms: 245000, cover_url: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200&h=200&fit=crop" },
    ],
  },
  "5": {
    title: "Focus Flow",
    description: "Concentration enhancing music",
    cover: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop",
    tracks: [
      { id: "f1", title: "Deep Focus", artist_id: "11", artist_name: "Ambient Works", duration_ms: 480000, cover_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop" },
      { id: "f2", title: "Study Session", artist_id: "11", artist_name: "Ambient Works", duration_ms: 360000, cover_url: "https://images.unsplash.com/photo-1614149162883-504ce4d13909?w=200&h=200&fit=crop" },
    ],
  },
};

const formatDuration = (ms: number) => {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

const Playlist = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentTrack, isPlaying, playTrack, setQueue } = usePlayer();
  
  const playlist = playlistsData[id || ""] || playlistsData["liked"];
  
  const handlePlayAll = () => {
    if (playlist.tracks.length > 0) {
      setQueue(playlist.tracks);
      playTrack(playlist.tracks[0], playlist.tracks);
    }
  };
  
  const handleTrackClick = (track: Track) => {
    setQueue(playlist.tracks);
    playTrack(track, playlist.tracks);
  };

  return (
    <AppLayout>
      {/* Header with gradient */}
      <div className="relative">
        <div 
          className="absolute inset-0 h-80 bg-gradient-to-b from-primary/30 to-background"
          style={{
            backgroundImage: `linear-gradient(to bottom, hsl(var(--primary) / 0.3), hsl(var(--background)))`,
          }}
        />
        
        <div className="relative px-4 pt-12 pb-6">
          {/* Back button */}
          <button 
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-full hover:bg-card/50 transition-colors mb-4"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          
          {/* Playlist info */}
          <div className="flex flex-col items-center text-center">
            <img
              src={playlist.cover}
              alt={playlist.title}
              className="w-48 h-48 rounded-2xl object-cover shadow-2xl mb-6"
            />
            <h1 className="text-2xl font-bold font-display mb-2">{playlist.title}</h1>
            <p className="text-muted-foreground text-sm mb-4">{playlist.description}</p>
            <p className="text-xs text-muted-foreground">{playlist.tracks.length} songs</p>
          </div>
          
          {/* Action buttons */}
          <div className="flex items-center justify-center gap-4 mt-6">
            <button className="p-3 rounded-full bg-card/50 hover:bg-card transition-colors">
              <Heart className="w-6 h-6" />
            </button>
            <button 
              onClick={handlePlayAll}
              className="w-14 h-14 rounded-full gradient-bg flex items-center justify-center glow-primary hover:scale-105 transition-transform"
            >
              <Play className="w-7 h-7 text-primary-foreground ml-1" fill="currentColor" />
            </button>
            <button className="p-3 rounded-full bg-card/50 hover:bg-card transition-colors">
              <Shuffle className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Track list */}
      <div className="px-4 pb-8">
        <div className="flex items-center gap-4 px-2 py-3 text-xs text-muted-foreground border-b border-border/50 mb-2">
          <span className="w-8 text-center">#</span>
          <span className="flex-1">Title</span>
          <Clock className="w-4 h-4" />
        </div>
        
        {playlist.tracks.map((track, index) => (
          <button
            key={track.id}
            onClick={() => handleTrackClick(track)}
            className={cn(
              "w-full flex items-center gap-4 p-2 rounded-xl hover:bg-card/50 transition-colors",
              currentTrack?.id === track.id && "bg-card/50"
            )}
          >
            <span className={cn(
              "w-8 text-center text-sm",
              currentTrack?.id === track.id && isPlaying ? "text-primary" : "text-muted-foreground"
            )}>
              {currentTrack?.id === track.id && isPlaying ? (
                <span className="flex items-center justify-center gap-0.5">
                  <span className="w-1 h-3 bg-primary rounded-full animate-wave" style={{ animationDelay: "0ms" }} />
                  <span className="w-1 h-3 bg-primary rounded-full animate-wave" style={{ animationDelay: "150ms" }} />
                  <span className="w-1 h-3 bg-primary rounded-full animate-wave" style={{ animationDelay: "300ms" }} />
                </span>
              ) : (
                index + 1
              )}
            </span>
            
            <img
              src={track.cover_url || playlist.cover}
              alt={track.title}
              className="w-12 h-12 rounded-lg object-cover"
            />
            
            <div className="flex-1 min-w-0 text-left">
              <h3 className={cn(
                "font-medium text-sm truncate",
                currentTrack?.id === track.id && "text-primary"
              )}>
                {track.title}
              </h3>
              <p className="text-xs text-muted-foreground truncate">{track.artist_name}</p>
            </div>
            
            <span className="text-xs text-muted-foreground">
              {formatDuration(track.duration_ms)}
            </span>
            
            <button 
              onClick={(e) => e.stopPropagation()}
              className="p-2 rounded-full hover:bg-card transition-colors"
            >
              <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
            </button>
          </button>
        ))}
      </div>
    </AppLayout>
  );
};

export default Playlist;
