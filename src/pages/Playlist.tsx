import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Play, Shuffle, Heart, MoreHorizontal, Clock, Music } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { usePlayer, Track } from "@/contexts/PlayerContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const formatDuration = (ms: number) => {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

const Playlist = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentTrack, isPlaying, playTrack, setQueue } = usePlayer();
  
  // Fetch playlist from database
  const { data: playlist, isLoading: playlistLoading } = useQuery({
    queryKey: ["playlist", id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from("playlists")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id && id !== "liked",
  });

  // Fetch playlist tracks
  const { data: playlistTracks, isLoading: tracksLoading } = useQuery({
    queryKey: ["playlist-tracks", id],
    queryFn: async () => {
      if (!id || id === "liked") return [];
      
      const { data, error } = await supabase
        .from("playlist_tracks")
        .select(`
          *,
          tracks (
            *,
            artists (id, name, avatar_url),
            albums (id, title, cover_url)
          )
        `)
        .eq("playlist_id", id)
        .order("position");
      
      if (error) throw error;
      
      return data?.map(pt => ({
        id: pt.tracks?.id || "",
        title: pt.tracks?.title || "",
        artist_id: pt.tracks?.artist_id || "",
        artist_name: pt.tracks?.artists?.name || "Unknown",
        cover_url: pt.tracks?.cover_url || pt.tracks?.albums?.cover_url || "",
        audio_url: pt.tracks?.audio_url || "",
        duration_ms: pt.tracks?.duration_ms || 0,
      })) as Track[];
    },
    enabled: !!id && id !== "liked",
  });

  // Fetch liked songs if id is "liked"
  const { data: likedTracks, isLoading: likedLoading } = useQuery({
    queryKey: ["liked-tracks"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("liked_tracks")
        .select(`
          *,
          tracks (
            *,
            artists (id, name, avatar_url),
            albums (id, title, cover_url)
          )
        `)
        .eq("user_id", user.id)
        .order("liked_at", { ascending: false });
      
      if (error) throw error;
      
      return data?.map(lt => ({
        id: lt.tracks?.id || "",
        title: lt.tracks?.title || "",
        artist_id: lt.tracks?.artist_id || "",
        artist_name: lt.tracks?.artists?.name || "Unknown",
        cover_url: lt.tracks?.cover_url || lt.tracks?.albums?.cover_url || "",
        audio_url: lt.tracks?.audio_url || "",
        duration_ms: lt.tracks?.duration_ms || 0,
      })) as Track[];
    },
    enabled: id === "liked",
  });

  const isLikedSongs = id === "liked";
  const tracks = isLikedSongs ? likedTracks : playlistTracks;
  const isLoading = isLikedSongs ? likedLoading : (playlistLoading || tracksLoading);

  const playlistInfo = isLikedSongs 
    ? { title: "Liked Songs", description: "Your favorite tracks", cover_url: null }
    : playlist;
  
  const handlePlayAll = () => {
    if (tracks && tracks.length > 0) {
      setQueue(tracks);
      playTrack(tracks[0], tracks);
    }
  };
  
  const handleTrackClick = (track: Track) => {
    if (tracks) {
      setQueue(tracks);
      playTrack(track, tracks);
    }
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
            {playlistInfo?.cover_url ? (
              <img
                src={playlistInfo.cover_url}
                alt={playlistInfo?.title}
                className="w-48 h-48 rounded-2xl object-cover shadow-2xl mb-6"
              />
            ) : (
              <div className="w-48 h-48 rounded-2xl gradient-bg flex items-center justify-center shadow-2xl mb-6">
                <Heart className="w-20 h-20 text-primary-foreground" />
              </div>
            )}
            <h1 className="text-2xl font-bold font-display mb-2">{playlistInfo?.title || "Playlist"}</h1>
            <p className="text-muted-foreground text-sm mb-4">{playlistInfo?.description || ""}</p>
            <p className="text-xs text-muted-foreground">{tracks?.length || 0} songs</p>
          </div>
          
          {/* Action buttons */}
          <div className="flex items-center justify-center gap-4 mt-6">
            <button className="p-3 rounded-full bg-card/50 hover:bg-card transition-colors">
              <Heart className="w-6 h-6" />
            </button>
            <button 
              onClick={handlePlayAll}
              disabled={!tracks || tracks.length === 0}
              className="w-14 h-14 rounded-full gradient-bg flex items-center justify-center glow-primary hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
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
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !tracks || tracks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-card/50 flex items-center justify-center mb-4">
              <Music className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">No songs yet</p>
            <p className="text-sm text-muted-foreground/70">
              {isLikedSongs ? "Like songs to add them here" : "Add songs to this playlist"}
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-4 px-2 py-3 text-xs text-muted-foreground border-b border-border/50 mb-2">
              <span className="w-8 text-center">#</span>
              <span className="flex-1">Title</span>
              <Clock className="w-4 h-4" />
            </div>
            
            {tracks.map((track, index) => (
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
                  src={track.cover_url || "https://images.unsplash.com/photo-1614149162883-504ce4d13909?w=200&h=200&fit=crop"}
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
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default Playlist;
