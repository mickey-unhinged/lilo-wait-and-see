import { useLyrics } from "@/hooks/useLyrics";
import { Loader2, Music2 } from "lucide-react";
import { usePlayer } from "@/contexts/PlayerContext";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface LyricsPanelProps {
  title?: string;
  artist?: string;
}

interface ParsedLyric {
  time: number; // in seconds
  text: string;
}

function parseSyncedLyrics(syncedLyrics: string): ParsedLyric[] {
  const lines = syncedLyrics.split("\n");
  const parsed: ParsedLyric[] = [];
  
  for (const line of lines) {
    // Match [mm:ss.xx] or [mm:ss] format
    const match = line.match(/^\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]\s*(.*)$/);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const ms = match[3] ? parseInt(match[3].padEnd(3, "0"), 10) : 0;
      const time = minutes * 60 + seconds + ms / 1000;
      const text = match[4].trim();
      if (text) {
        parsed.push({ time, text });
      }
    }
  }
  
  return parsed;
}

function getCurrentLyricIndex(lyrics: ParsedLyric[], currentTime: number): number {
  for (let i = lyrics.length - 1; i >= 0; i--) {
    if (currentTime >= lyrics[i].time - 0.3) {
      return i;
    }
  }
  return -1;
}

export function LyricsPanel({ title, artist }: LyricsPanelProps) {
  const { lyrics, syncedLyrics, isLoading, error } = useLyrics(title, artist);
  const { progress } = usePlayer();
  const [currentIndex, setCurrentIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLParagraphElement>(null);

  const parsedLyrics = syncedLyrics ? parseSyncedLyrics(syncedLyrics) : [];
  const hasSyncedLyrics = parsedLyrics.length > 0;

  // Update current lyric index based on playback progress
  useEffect(() => {
    if (hasSyncedLyrics) {
      const index = getCurrentLyricIndex(parsedLyrics, progress);
      setCurrentIndex(index);
    }
  }, [progress, hasSyncedLyrics, parsedLyrics.length]);

  // Auto-scroll to active lyric
  useEffect(() => {
    if (activeRef.current && containerRef.current) {
      activeRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [currentIndex]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12 text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin mb-4" />
        <p className="text-sm font-medium">Loading lyrics...</p>
      </div>
    );
  }

  if (error || (!lyrics && !syncedLyrics)) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12 text-muted-foreground">
        <Music2 className="w-12 h-12 mb-4 opacity-50" />
        <p className="text-sm font-medium">Lyrics not available</p>
        <p className="text-xs mt-1 opacity-70">Try another track</p>
      </div>
    );
  }

  // Render synced karaoke-style lyrics
  if (hasSyncedLyrics) {
    return (
      <div 
        ref={containerRef}
        className="h-full overflow-y-auto scroll-smooth px-4 py-6 hide-scrollbar"
      >
        <div className="space-y-4 pb-32 pt-16">
          {parsedLyrics.map((lyric, index) => {
            const isActive = index === currentIndex;
            const isPast = index < currentIndex;
            
            return (
              <p
                key={index}
                ref={isActive ? activeRef : null}
                className={cn(
                  "text-center transition-all duration-500 ease-out font-serif leading-relaxed cursor-pointer",
                  isActive 
                    ? "text-xl md:text-2xl font-bold text-primary scale-105" 
                    : isPast 
                      ? "text-base md:text-lg text-muted-foreground/50" 
                      : "text-base md:text-lg text-muted-foreground/70 hover:text-foreground/80"
                )}
              >
                {lyric.text}
              </p>
            );
          })}
        </div>
      </div>
    );
  }

  // Fallback to plain lyrics
  return (
    <div className="h-full overflow-y-auto px-4 py-6 hide-scrollbar">
      <pre className="whitespace-pre-wrap font-serif text-base md:text-lg leading-relaxed text-foreground/90 text-center">
        {lyrics}
      </pre>
    </div>
  );
}
