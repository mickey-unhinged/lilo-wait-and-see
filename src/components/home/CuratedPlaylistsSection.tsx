import { useState, useEffect, useMemo } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Track, usePlayer } from "@/contexts/PlayerContext";
import { PlaylistCard } from "./PlaylistCard";
import { SectionHeader } from "./SectionHeader";
import { HorizontalScroll } from "./HorizontalScroll";
import { extractKeywordsFromHistory } from "@/hooks/useSearchHistory";

interface CuratedPlaylist {
  id: string;
  title: string;
  description: string;
  coverUrl: string;
  tracks: Track[];
  mood: string;
}

interface PlayHistoryEntry {
  track: Track;
  playedAt: string;
}

function getSeedArtists(): string[] {
  try {
    const stored = localStorage.getItem("lilo-play-history");
    if (!stored) return [];
    const entries: PlayHistoryEntry[] = JSON.parse(stored);
    const counts = new Map<string, number>();
    entries.forEach((entry) => {
      const artist = entry.track?.artist_name;
      if (artist) {
        counts.set(artist, (counts.get(artist) || 0) + 1);
      }
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([artist]) => artist);
  } catch {
    return [];
  }
}

const MOOD_THEMES = [
  { mood: "chill", title: "Chill Vibes", description: "Relaxing tracks to unwind", gradient: "from-blue-500 to-purple-600" },
  { mood: "energy", title: "Energy Boost", description: "High-energy hits to pump you up", gradient: "from-orange-500 to-red-600" },
  { mood: "focus", title: "Deep Focus", description: "Music to help you concentrate", gradient: "from-green-500 to-teal-600" },
  { mood: "happy", title: "Feel Good", description: "Uplifting songs for good moods", gradient: "from-yellow-500 to-orange-500" },
  { mood: "workout", title: "Workout Mix", description: "Power through your workout", gradient: "from-red-500 to-pink-600" },
  { mood: "sleep", title: "Sleep Sounds", description: "Peaceful tracks for rest", gradient: "from-indigo-500 to-blue-700" },
];

export function CuratedPlaylistsSection() {
  const [playlists, setPlaylists] = useState<CuratedPlaylist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { playTrack, setQueue } = usePlayer();

  useEffect(() => {
    fetchCuratedPlaylists();
    
    // Refresh every 30 minutes
    const interval = setInterval(fetchCuratedPlaylists, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchCuratedPlaylists = async () => {
    setIsLoading(true);
    try {
      const seedArtists = getSeedArtists();
      const searchTerms = extractKeywordsFromHistory();
      
      // Generate personalized playlists based on moods
      const playlistPromises = MOOD_THEMES.slice(0, 4).map(async (theme) => {
        const { data, error } = await supabase.functions.invoke("trending-suggestions", {
          body: {
            type: "mood",
            mood: theme.mood,
            seedArtists,
            searchTerms,
            limit: 15,
          },
        });

        if (error) throw error;

        return {
          id: `curated-${theme.mood}-${Date.now()}`,
          title: theme.title,
          description: theme.description,
          coverUrl: data?.tracks?.[0]?.cover_url || "",
          tracks: data?.tracks || [],
          mood: theme.mood,
        };
      });

      const results = await Promise.all(playlistPromises);
      setPlaylists(results.filter((p) => p.tracks.length > 0));
    } catch (error) {
      console.error("Failed to fetch curated playlists:", error);
      setPlaylists([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayPlaylist = (playlist: CuratedPlaylist) => {
    if (playlist.tracks.length === 0) return;
    setQueue(playlist.tracks);
    playTrack(playlist.tracks[0], playlist.tracks);
  };

  if (isLoading) {
    return (
      <section className="mb-8">
        <SectionHeader 
          title="Curated For You" 
          subtitle="Personalized playlists based on your taste"
        />
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </section>
    );
  }

  if (playlists.length === 0) {
    return null;
  }

  return (
    <section className="mb-8">
      <SectionHeader 
        title="Curated For You" 
        subtitle="Personalized playlists based on your taste"
        showAll={false}
      />
      <HorizontalScroll>
        {playlists.map((playlist) => (
          <PlaylistCard
            key={playlist.id}
            id={playlist.id}
            title={playlist.title}
            description={playlist.description}
            imageUrl={playlist.coverUrl}
            trackCount={playlist.tracks.length}
            onClick={() => handlePlayPlaylist(playlist)}
            variant="large"
          />
        ))}
      </HorizontalScroll>
    </section>
  );
}
