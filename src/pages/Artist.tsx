import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Loader2, Music4, Play, Shuffle } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { usePlayer, type Track } from "@/contexts/PlayerContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const Artist = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { playTrack, setQueue, currentTrack, isPlaying } = usePlayer();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const artistName = useMemo(() => {
    if (!slug) return "Artist";
    try {
      return decodeURIComponent(slug);
    } catch {
      return slug.replace(/-/g, " ");
    }
  }, [slug]);

  useEffect(() => {
    const fetchArtistStation = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("trending-suggestions", {
          body: { type: "personalized", seedArtists: [artistName], limit: 30 },
        });
        if (error) throw error;
        setTracks(data?.tracks || []);
      } catch (err) {
        console.error("Failed to load artist station:", err);
        setTracks([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchArtistStation();
  }, [artistName]);

  const handlePlayAll = () => {
    if (tracks.length === 0) return;
    setQueue(tracks);
    playTrack(tracks[0], tracks);
  };

  const handleShuffle = () => {
    if (tracks.length === 0) return;
    const shuffled = [...tracks].sort(() => Math.random() - 0.5);
    setQueue(shuffled);
    playTrack(shuffled[0], shuffled);
  };

  const handleTrackClick = (track: Track) => {
    setQueue(tracks);
    playTrack(track, tracks);
  };

  return (
    <AppLayout>
      <div className="px-4 pt-12 pb-6 space-y-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 rounded-full hover:bg-card transition-colors flex items-center gap-2 text-sm text-muted-foreground"
        >
          <ChevronLeft className="w-5 h-5" />
          Back
        </button>

        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-40 h-40 rounded-full gradient-bg flex items-center justify-center shadow-2xl">
            <Music4 className="w-16 h-16 text-primary-foreground" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-2">Artist station</p>
            <h1 className="text-4xl font-bold font-display">{artistName}</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePlayAll}
              disabled={tracks.length === 0}
              className="px-6 py-2 rounded-full bg-primary text-primary-foreground flex items-center gap-2 font-medium disabled:opacity-50"
            >
              <Play className="w-4 h-4" />
              Play
            </button>
            <button
              onClick={handleShuffle}
              disabled={tracks.length === 0}
              className="px-6 py-2 rounded-full border border-border flex items-center gap-2 font-medium disabled:opacity-50"
            >
              <Shuffle className="w-4 h-4" />
              Shuffle
            </button>
          </div>
          <p className="text-sm text-muted-foreground">{tracks.length} curated tracks inspired by {artistName}</p>
        </div>

        <div className="space-y-2">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : tracks.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No tracks available yet</p>
              <p className="text-sm text-muted-foreground/80">Try exploring another artist</p>
            </div>
          ) : (
            tracks.map((track, index) => (
              <button
                key={`${track.id}-${index}`}
                onClick={() => handleTrackClick(track)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-xl hover:bg-card/50 transition-colors text-left",
                  currentTrack?.id === track.id && "bg-card/50"
                )}
              >
                <span className="w-6 text-sm text-muted-foreground text-center">{index + 1}</span>
                <img
                  src={track.cover_url || track.album_cover || "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=60&h=60&fit=crop"}
                  alt={track.title}
                  className="w-12 h-12 rounded-lg object-cover"
                />
                <div className="flex-1 min-w-0">
                  <p className={cn("font-medium truncate", currentTrack?.id === track.id && "text-primary")}>
                    {track.title}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                    {track.artist_name}
                  </p>
                </div>
                {currentTrack?.id === track.id && isPlaying && (
                  <div className="flex items-center gap-0.5">
                    <div className="w-1 h-4 bg-primary rounded-full animate-wave" />
                    <div className="w-1 h-4 bg-primary rounded-full animate-wave" style={{ animationDelay: "120ms" }} />
                    <div className="w-1 h-4 bg-primary rounded-full animate-wave" style={{ animationDelay: "240ms" }} />
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default Artist;

