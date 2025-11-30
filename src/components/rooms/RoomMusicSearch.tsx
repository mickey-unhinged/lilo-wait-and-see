import { useState } from "react";
import { Search, Play, Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/useDebounce";
import type { Track } from "@/contexts/PlayerContext";

interface RoomMusicSearchProps {
  onSelectTrack: (track: Track) => void;
}

export function RoomMusicSearch({ onSelectTrack }: RoomMusicSearchProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Track[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const debouncedQuery = useDebounce(query, 400);

  const handleSearch = async () => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke("youtube-music-search", {
        body: { query: debouncedQuery, limit: 15 },
      });

      if (error) throw error;

      const tracks: Track[] = (data?.results || []).map((item: any) => ({
        id: item.videoId || item.id,
        title: item.title || item.name,
        artist_name: item.artist || item.artist_name || "Unknown Artist",
        album_title: item.album || item.album_title || "",
        cover_url: item.thumbnail || item.cover_url,
        album_cover: item.thumbnail || item.cover_url,
        duration_ms: item.duration_ms || (item.duration ? item.duration * 1000 : 0),
        videoId: item.videoId || item.id,
        source: "youtube",
      }));

      setResults(tracks);
    } catch (err) {
      console.error("Search failed:", err);
      toast({ title: "Search failed", variant: "destructive" });
    } finally {
      setIsSearching(false);
    }
  };

  // Search when debounced query changes
  useState(() => {
    if (debouncedQuery) handleSearch();
  });

  const handleSelect = (track: Track) => {
    onSelectTrack(track);
    setIsOpen(false);
    setQuery("");
    setResults([]);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="w-4 h-4" />
          Add Music
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl">
        <SheetHeader className="pb-4">
          <SheetTitle>Search Music</SheetTitle>
        </SheetHeader>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (e.target.value) handleSearch();
            }}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search for songs..."
            className="pl-10 pr-10"
          />
          {query && (
            <button
              onClick={() => {
                setQuery("");
                setResults([]);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>

        <div className="overflow-y-auto max-h-[calc(80vh-140px)] space-y-2">
          {isSearching ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse flex items-center gap-3 p-2">
                  <div className="w-12 h-12 bg-muted rounded" />
                  <div className="flex-1">
                    <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : results.length === 0 && query ? (
            <p className="text-center text-muted-foreground py-8">No results found</p>
          ) : (
            results.map((track) => (
              <button
                key={track.id}
                onClick={() => handleSelect(track)}
                className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-card transition-colors text-left"
              >
                <img
                  src={track.cover_url || track.album_cover}
                  alt=""
                  className="w-12 h-12 rounded object-cover"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{track.title}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {track.artist_name}
                  </p>
                </div>
                <Play className="w-5 h-5 text-primary" />
              </button>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
