import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Music } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Track } from "@/contexts/PlayerContext";
import { addStreamTrackToPlaylist } from "@/lib/playlistStreams";

interface Playlist {
  id: string;
  title: string;
  cover_url: string | null;
}

interface AddToPlaylistSheetProps {
  isOpen: boolean;
  onClose: () => void;
  track: Track | null;
}

export function AddToPlaylistSheet({ isOpen, onClose, track }: AddToPlaylistSheetProps) {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [showCreateNew, setShowCreateNew] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchPlaylists();
    }
  }, [isOpen]);

  const fetchPlaylists = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("playlists")
        .select("id, title, cover_url")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPlaylists(data || []);
    } catch (error) {
      console.error("Failed to fetch playlists:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const isStreamingTrack = !!track?.id && (track.id.startsWith("ytm-") || track.id.startsWith("itunes-") || track.id.length < 20);

  const addToPlaylist = async (playlistId: string) => {
    if (!track) return;

    if (isStreamingTrack) {
      addStreamTrackToPlaylist(playlistId, track);
      toast({ title: "Added to playlist!" });
      onClose();
      return;
    }

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

      toast({ title: "Added to playlist!" });
      onClose();
    } catch (error) {
      const dbError = error as { code?: string };
      if (dbError.code === "23505") {
        toast({ title: "Track already in playlist", variant: "destructive" });
      } else {
        console.error("Failed to add to playlist:", error);
        toast({ title: "Failed to add to playlist", variant: "destructive" });
      }
    }
  };

  const createAndAddToPlaylist = async () => {
    if (!track || !newPlaylistName.trim()) return;

    setIsCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Create playlist
      const { data: playlist, error: playlistError } = await supabase
        .from("playlists")
        .insert({
          owner_id: user.id,
          title: newPlaylistName.trim(),
          is_public: true,
        })
        .select()
        .single();

      if (playlistError) throw playlistError;

      if (isStreamingTrack) {
        addStreamTrackToPlaylist(playlist.id, track);
      } else {
        const { error: trackError } = await supabase
          .from("playlist_tracks")
          .insert({
            playlist_id: playlist.id,
            track_id: track.id,
            position: 0,
          });

        if (trackError) throw trackError;
      }

      toast({ title: "Playlist created and track added!" });
      setNewPlaylistName("");
      setShowCreateNew(false);
      onClose();
    } catch (error) {
      console.error("Failed to create playlist:", error);
      toast({ title: "Failed to create playlist", variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[80vh]">
        <SheetHeader>
          <SheetTitle>Add to playlist</SheetTitle>
        </SheetHeader>

        {track && (
          <div className="flex items-center gap-3 py-4 border-b border-border/50">
            <img
              src={track.cover_url || track.album_cover || "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=60&h=60&fit=crop"}
              alt={track.title}
              className="w-12 h-12 rounded-lg object-cover"
            />
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{track.title}</p>
              <p className="text-sm text-muted-foreground truncate">{track.artist_name}</p>
            </div>
            {isStreamingTrack && (
              <p className="text-xs text-red-500 font-medium">Streaming track</p>
            )}
          </div>
        )}

        <div className="py-4 space-y-2 max-h-[50vh] overflow-y-auto">
          {/* Create new playlist button */}
          {!showCreateNew && (
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => setShowCreateNew(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create new playlist
            </Button>
          )}

          {/* Create new playlist form */}
          {showCreateNew && (
            <div className="p-4 bg-card/50 rounded-lg space-y-3">
              <Input
                placeholder="Playlist name"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newPlaylistName.trim()) {
                    createAndAddToPlaylist();
                  }
                }}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={createAndAddToPlaylist}
                  disabled={isCreating || !newPlaylistName.trim()}
                  className="flex-1"
                >
                  {isCreating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Create & Add
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setShowCreateNew(false);
                    setNewPlaylistName("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Existing playlists */}
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : playlists.length === 0 ? (
            <div className="text-center py-8">
              <Music className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground text-sm">No playlists yet</p>
            </div>
          ) : (
            playlists.map((playlist) => (
              <button
                key={playlist.id}
                onClick={() => addToPlaylist(playlist.id)}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-card/50 transition-colors"
              >
                {playlist.cover_url ? (
                  <img
                    src={playlist.cover_url}
                    alt={playlist.title}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-card flex items-center justify-center">
                    <Music className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
                <span className="font-medium text-left flex-1 truncate">{playlist.title}</span>
              </button>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
