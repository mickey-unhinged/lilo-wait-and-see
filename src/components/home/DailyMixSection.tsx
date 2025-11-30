import { useEffect, useMemo, useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Track, usePlayer } from "@/contexts/PlayerContext";
import { TrackCard } from "./TrackCard";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

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
      .slice(0, 4)
      .map(([artist]) => artist);
  } catch (error) {
    console.error("Failed to parse play history:", error);
    return [];
  }
}

export function DailyMixSection() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seeds, setSeeds] = useState<string[]>([]);
  const { playTrack, setQueue } = usePlayer();

  useEffect(() => {
    const seedArtists = getSeedArtists();
    setSeeds(seedArtists);
    fetchRecommendations(seedArtists);
  }, []);

  const title = useMemo(() => {
    if (seeds.length === 0) return "Daily Mix";
    if (seeds.length === 1) return `Because you love ${seeds[0]}`;
    if (seeds.length === 2) return `Mix inspired by ${seeds[0]} & ${seeds[1]}`;
    return `Daily Mix: ${seeds.slice(0, 3).join(", ")}`;
  }, [seeds]);

  const fetchRecommendations = async (seedArtists: string[]) => {
    setIsLoading(true);
    setError(null);
    try {
      const body =
        seedArtists.length > 0
          ? { type: "personalized", seedArtists, limit: 12 }
          : { limit: 12 };

      const { data, error: fnError } = await supabase.functions.invoke("trending-suggestions", {
        body,
      });

      if (fnError) throw fnError;
      setTracks(data?.tracks || []);
    } catch (err) {
      console.error("Failed to load recommendations:", err);
      setError("We couldn't build your mix right now.");
      setTracks([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlay = (track: Track) => {
    if (tracks.length === 0) return;
    setQueue(tracks);
    playTrack(track, tracks);
  };

  if (error || (!isLoading && tracks.length === 0)) {
    return null;
  }

  return (
    <section className="px-4 py-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Daily Mix</p>
            <h2 className="text-lg font-semibold">{title}</h2>
          </div>
        </div>
        {seeds.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Based on {seeds.slice(0, 3).join(", ")}
            {seeds.length > 3 ? " and more" : ""}
          </p>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-4 pb-4">
            {tracks.map((track) => (
              <TrackCard
                key={track.id}
                title={track.title}
                artist={track.artist_name}
                imageUrl={
                  track.cover_url ||
                  track.album_cover ||
                  "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200&h=200&fit=crop"
                }
                onClick={() => handlePlay(track)}
              />
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      )}
    </section>
  );
}

