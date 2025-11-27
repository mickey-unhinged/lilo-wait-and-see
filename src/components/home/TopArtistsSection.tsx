import { useState, useEffect } from "react";
import { SectionHeader } from "./SectionHeader";
import { HorizontalScroll } from "./HorizontalScroll";
import { ArtistCard } from "./ArtistCard";
import { Users } from "lucide-react";
import { Track } from "@/contexts/PlayerContext";

const LOCAL_STORAGE_KEY = "lilo-play-history";

interface PlayHistoryEntry {
  track: Track;
  playedAt: string;
}

interface ArtistStats {
  name: string;
  imageUrl: string;
  playCount: number;
}

function getTopArtistsFromHistory(entries: PlayHistoryEntry[]): ArtistStats[] {
  const artistCounts = new Map<string, ArtistStats>();

  for (const entry of entries) {
    const artistName = entry.track.artist_name;
    const existing = artistCounts.get(artistName);

    if (existing) {
      existing.playCount++;
    } else {
      artistCounts.set(artistName, {
        name: artistName,
        imageUrl:
          entry.track.artist_avatar ||
          entry.track.cover_url ||
          entry.track.album_cover ||
          "https://images.unsplash.com/photo-1614149162883-504ce4d13909?w=200&h=200&fit=crop",
        playCount: 1,
      });
    }
  }

  // Sort by play count and return top 10
  return Array.from(artistCounts.values())
    .sort((a, b) => b.playCount - a.playCount)
    .slice(0, 10);
}

function formatPlayCount(count: number): string {
  if (count === 1) return "1 play";
  return `${count} plays`;
}

export function TopArtistsSection() {
  const [topArtists, setTopArtists] = useState<ArtistStats[]>([]);

  useEffect(() => {
    const loadTopArtists = () => {
      try {
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (stored) {
          const entries: PlayHistoryEntry[] = JSON.parse(stored);
          const artists = getTopArtistsFromHistory(entries);
          setTopArtists(artists);
        }
      } catch (e) {
        console.error("Failed to load top artists:", e);
      }
    };

    loadTopArtists();

    // Listen for storage changes and poll
    const handleStorage = () => loadTopArtists();
    window.addEventListener("storage", handleStorage);
    const interval = setInterval(loadTopArtists, 5000);

    return () => {
      window.removeEventListener("storage", handleStorage);
      clearInterval(interval);
    };
  }, []);

  if (topArtists.length === 0) {
    return (
      <section className="px-4 py-4">
        <SectionHeader
          title="Your Top Artists"
          subtitle="Based on your listening"
        />
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-card/50 flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">No artists yet</p>
          <p className="text-sm text-muted-foreground/70">
            Play some music to discover your favorites
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="px-4 py-4">
      <SectionHeader
        title="Your Top Artists"
        subtitle="Based on your listening"
      />
      <HorizontalScroll>
        {topArtists.map((artist, index) => (
          <ArtistCard
            key={`${artist.name}-${index}`}
            name={artist.name}
            imageUrl={artist.imageUrl}
            followers={formatPlayCount(artist.playCount)}
          />
        ))}
      </HorizontalScroll>
    </section>
  );
}
