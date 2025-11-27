import { useLyrics } from "@/hooks/useLyrics";
import { Loader2, Music2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface LyricsPanelProps {
  title?: string;
  artist?: string;
}

export function LyricsPanel({ title, artist }: LyricsPanelProps) {
  const { lyrics, isLoading, error } = useLyrics(title, artist);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12 text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin mb-4" />
        <p className="text-sm">Loading lyrics...</p>
      </div>
    );
  }

  if (error || !lyrics) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12 text-muted-foreground">
        <Music2 className="w-12 h-12 mb-4 opacity-50" />
        <p className="text-sm">Lyrics not available</p>
        <p className="text-xs mt-1 opacity-70">Try another track</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="px-6 py-4">
        <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground/90">
          {lyrics}
        </pre>
      </div>
    </ScrollArea>
  );
}
