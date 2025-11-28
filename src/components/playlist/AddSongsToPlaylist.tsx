import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Loader2 } from "lucide-react";
import { useMusicSearch } from "@/hooks/useMusicSearch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface AddSongsToPlaylistProps {
  playlistId: string;
}

export function AddSongsToPlaylist({ playlistId }: AddSongsToPlaylistProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { results, isLoading, searchMusic } = useMusicSearch();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleSearch = () => {
    if (searchQuery.trim()) {
      searchMusic(searchQuery);
    }
  };

  const addToPlaylist = async (track: any) => {
    try {
      // Get current max position
      const { data: existingTracks } = await supabase
        .from("playlist_tracks")
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
    } catch (error: any) {
      if (error.code === "23505") {
        toast({ title: "Track already in playlist", variant: "destructive" });
      } else {
        console.error("Failed to add track:", error);
        toast({ title: "Failed to add track", variant: "destructive" });
      }
    }
  };

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
          {/* Search bar */}
          <div className="flex gap-2">
            <Input
              placeholder="Search for songs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSearch();
                }
              }}
            />
            <Button onClick={handleSearch} disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
            </Button>
          </div>

          {/* Search results */}
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : results.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? "No results found" : "Search for songs to add"}
              </div>
            ) : (
              results.map((track) => (
                <div
                  key={track.id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-card/50"
                >
                  <img
                    src={track.cover_url || "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=60&h=60&fit=crop"}
                    alt={track.title}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{track.title}</p>
                    <p className="text-sm text-muted-foreground truncate">{track.artist_name}</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => addToPlaylist(track)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
