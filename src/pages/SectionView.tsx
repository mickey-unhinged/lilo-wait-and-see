import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, Loader2, Music } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { usePlayer, Track } from "@/contexts/PlayerContext";
import { supabase } from "@/integrations/supabase/client";

const SectionView = () => {
  const { section } = useParams<{ section: string }>();
  const navigate = useNavigate();
  const { playTrack, setQueue, currentTrack, isPlaying } = usePlayer();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTracks();
  }, [section]);

  const fetchTracks = async () => {
    setIsLoading(true);
    try {
      if (section === "trending") {
        const { data, error } = await supabase.functions.invoke("trending-suggestions", {
          body: { limit: 50 },
        });
        if (!error && data?.tracks) {
          setTracks(data.tracks);
        }
      } else if (section === "for-you") {
        // Get personalized tracks
        const LOCAL_STORAGE_KEY = "lilo-play-history";
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
        let seedArtists: string[] = [];
        
        if (stored) {
          const entries = JSON.parse(stored);
          const artistCounts: Record<string, number> = {};
          entries.forEach((e: any) => {
            const artist = e.track?.artist_name;
            if (artist) {
              artistCounts[artist] = (artistCounts[artist] || 0) + 1;
            }
          });
          seedArtists = Object.entries(artistCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([artist]) => artist);
        }

        const { data, error } = await supabase.functions.invoke("trending-suggestions", {
          body: { type: "personalized", seedArtists, limit: 50 },
        });
        if (!error && data?.tracks) {
          setTracks(data.tracks);
        }
      } else if (section === "recently-played") {
        const LOCAL_STORAGE_KEY = "lilo-play-history";
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (stored) {
          const entries = JSON.parse(stored);
          setTracks(entries.map((e: any) => e.track));
        }
      } else if (section === "top-artists") {
        // This would need artist-specific handling
        setTracks([]);
      }
    } catch (error) {
      console.error("Failed to fetch tracks:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTrackClick = (track: Track) => {
    setQueue(tracks);
    playTrack(track, tracks);
  };

  const sectionTitles: Record<string, string> = {
    "trending": "Trending Now",
    "for-you": "For You",
    "recently-played": "Recently Played",
    "top-artists": "Top Artists",
  };

  return (
    <AppLayout>
      <div className="px-4 pt-12 pb-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-full hover:bg-card transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-bold font-display">
            {sectionTitles[section || ""] || "Browse"}
          </h1>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : tracks.length === 0 ? (
          <div className="text-center py-12">
            <Music className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No tracks found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {tracks.map((track, index) => (
              <button
                key={`${track.id}-${index}`}
                onClick={() => handleTrackClick(track)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl hover:bg-card/50 transition-colors ${
                  currentTrack?.id === track.id ? "bg-card/50" : ""
                }`}
              >
                <span className="w-6 text-sm text-muted-foreground text-center">
                  {index + 1}
                </span>
                <img
                  src={track.cover_url || track.album_cover || "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=60&h=60&fit=crop"}
                  alt={track.title}
                  className="w-12 h-12 rounded-lg object-cover"
                />
                <div className="flex-1 min-w-0 text-left">
                  <p className={`font-medium truncate ${
                    currentTrack?.id === track.id ? "text-primary" : ""
                  }`}>
                    {track.title}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                    {track.artist_name}
                  </p>
                </div>
                {currentTrack?.id === track.id && isPlaying && (
                  <div className="flex items-center gap-0.5">
                    <div className="w-0.5 h-3 bg-primary rounded-full animate-pulse" />
                    <div className="w-0.5 h-4 bg-primary rounded-full animate-pulse delay-75" />
                    <div className="w-0.5 h-2 bg-primary rounded-full animate-pulse delay-150" />
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default SectionView;