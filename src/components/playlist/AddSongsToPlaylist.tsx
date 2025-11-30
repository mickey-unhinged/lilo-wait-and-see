import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Loader2 } from "lucide-react";
import { useLibraryTrackSearch } from "@/hooks/useLibraryTrackSearch";
import { useLiveVideoSearch } from "@/hooks/useLiveVideoSearch";
import { useMusicSearch } from "@/hooks/useMusicSearch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import type { Track } from "@/contexts/PlayerContext";
import { addStreamTrackToPlaylist } from "@/lib/playlistStreams";
import { cn } from "@/lib/utils";

interface AddSongsToPlaylistProps {
  playlistId: string;
}

export function AddSongsToPlaylist({ playlistId }: AddSongsToPlaylistProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [source, setSource] = useState<"library" | "live" | "preview">("library");
  const library = useLibraryTrackSearch();
  const live = useLiveVideoSearch();
  const preview = useMusicSearch();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleSearch = () => {
    if (searchQuery.trim()) {
      if (source === "library") {
        library.searchTracks(searchQuery);
      } else if (source === "live") {
        live.searchMusic(searchQuery);
      } else {
        preview.searchMusic(searchQuery);
      }
    }
  };

  const addCatalogTrack = async (track: Track) => {
    try {
      // Get current max position
      const { data: existingTracks } = await supabase
        .from<{ position: number }>("playlist_tracks")
        .select("position")
        .eq("playlist_id", playlistId)
        .order("position", { ascending: false })
        .limit(1);

      const nextPosition = existingTracks && existingTracks.length > 0 
        ? existingTracks[0].position + 1 
        : 0;

      const { error } = await supabase
        .from("playlist_tracks")
        .insert({
          playlist_id: playlistId,
          track_id: track.id,
          position: nextPosition,
        });

      if (error) throw error;

      toast({ title: "Track added!" });
      queryClient.invalidateQueries({ queryKey: ["playlist-tracks", playlistId] });
    } catch (error) {
      const dbError = error as { code?: string };
      if (dbError.code === "23505") {
        toast({ title: "Track already in playlist", variant: "destructive" });
      } else {
        console.error("Failed to add track:", error);
        toast({ title: "Failed to add track", variant: "destructive" });
      }
    }
  };

  const handleAddTrack = async (track: Track) => {
    if (source === "library") {
      await addCatalogTrack(track);
    } else {
      addStreamTrackToPlaylist(playlistId, track);
      toast({ title: "Added to playlist!" });
    }
  };

  const activeResults =
    source === "library"
      ? library.results
      : source === "live"
        ? live.results
        : preview.results;
  const activeLoading =
    source === "library"
      ? library.isLoading
      : source === "live"
        ? live.isLoading
        : preview.isLoading;
  const activeError =
    source === "library"
      ? library.error
      : source === "live"
        ? live.error
        : preview.error;
  const placeholder =
    source === "library"
      ? "Search your library..."
      : source === "live"
        ? "Search Lilo Live..."
        : "Search previews...";

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add Songs
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-3xl h-[80vh]">
        <SheetHeader>
          <SheetTitle>Add Songs</SheetTitle>
        </SheetHeader>

        <div className="py-4 space-y-4">
          <div className="flex gap-2">
            {[
              { id: "library" as const, label: "Library" },
              { id: "live" as const, label: "Live" },
              { id: "preview" as const, label: "Previews" },
            ].map((option) => (
              <button
                key={option.id}
                onClick={() => setSource(option.id)}
                className={cn(
                  "flex-1 text-sm py-1.5 rounded-full border transition-colors",
                  source === option.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-border hover:bg-card/70"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="flex gap-2">
            <Input
              placeholder={placeholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSearch();
                }
              }}
            />
            <Button onClick={handleSearch} disabled={activeLoading}>
              {activeLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
            </Button>
          </div>

          {/* Search results */}
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {activeLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : activeResults.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {activeError
                  ? "We couldn't fetch songs right now"
                  : searchQuery
                    ? "No songs found"
                    : "Start a search to add songs"}
              </div>
            ) : (
              activeResults.map((track) => {
                const isStreamingResult =
                  source !== "library" ||
                  track.id.startsWith("ytm-") ||
                  track.id.startsWith("itunes-") ||
                  track.id.length < 20;
                return (
                <div
                  key={track.id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-card/50"
                >
                  <img
                    src={track.cover_url || track.album_cover || "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=60&h=60&fit=crop"}
                    alt={track.title}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{track.title}</p>
                    <p className="text-sm text-muted-foreground truncate flex items-center gap-2">
                      {track.artist_name} {track.album_title ? `• ${track.album_title}` : ""}
                      {isStreamingResult && (
                        <span className="text-[10px] uppercase tracking-wide border border-border rounded-full px-2 py-0.5">
                          Stream
                        </span>
                      )}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleAddTrack(track)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              );
              })
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
