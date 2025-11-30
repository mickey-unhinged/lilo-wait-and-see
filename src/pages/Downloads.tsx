import { useState } from "react";
import { Download, Trash2, Music, Play, HardDrive, Loader2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useOfflineMusic, OfflineTrack } from "@/hooks/useOfflineMusic";
import { usePlayer, Track } from "@/contexts/PlayerContext";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

const Downloads = () => {
  const { downloads, isLoading, removeDownload, clearAllDownloads, getTotalSize, getOfflineAudioUrl } = useOfflineMusic();
  const { playTrack } = usePlayer();
  const { toast } = useToast();
  const [removingId, setRemovingId] = useState<string | null>(null);

  const handlePlay = async (offlineTrack: OfflineTrack) => {
    const audioUrl = await getOfflineAudioUrl(offlineTrack.id);
    if (!audioUrl) {
      toast({ title: "Failed to play", description: "Audio file not found", variant: "destructive" });
      return;
    }

    const track: Track = {
      id: offlineTrack.id,
      title: offlineTrack.title,
      artist_id: "",
      artist_name: offlineTrack.artist_name,
      cover_url: offlineTrack.cover_url || offlineTrack.album_cover,
      album_cover: offlineTrack.album_cover,
      duration_ms: offlineTrack.duration_ms,
      audio_url: audioUrl,
    };

    playTrack(track, downloads.map(d => ({
      id: d.id,
      title: d.title,
      artist_id: "",
      artist_name: d.artist_name,
      cover_url: d.cover_url || d.album_cover,
      album_cover: d.album_cover,
      duration_ms: d.duration_ms,
    })));
  };

  const handleRemove = async (trackId: string) => {
    setRemovingId(trackId);
    const success = await removeDownload(trackId);
    setRemovingId(null);
    if (success) {
      toast({ title: "Removed from downloads" });
    } else {
      toast({ title: "Failed to remove", variant: "destructive" });
    }
  };

  const handleClearAll = async () => {
    const success = await clearAllDownloads();
    if (success) {
      toast({ title: "All downloads cleared" });
    } else {
      toast({ title: "Failed to clear downloads", variant: "destructive" });
    }
  };

  const totalSize = getTotalSize();

  return (
    <AppLayout>
      <div className="px-4 pt-12 pb-32">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold font-display flex items-center gap-2">
              <Download className="w-8 h-8" />
              Downloads
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {downloads.length} {downloads.length === 1 ? "song" : "songs"} • {formatBytes(totalSize)}
            </p>
          </div>
          
          {downloads.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-destructive">
                  <Trash2 className="w-4 h-4 mr-1" />
                  Clear All
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear all downloads?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will remove all {downloads.length} downloaded songs from your device. 
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearAll} className="bg-destructive text-destructive-foreground">
                    Clear All
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        {/* Storage info */}
        <div className="bg-card rounded-xl p-4 mb-6 flex items-center gap-3">
          <HardDrive className="w-5 h-5 text-primary" />
          <div className="flex-1">
            <p className="text-sm font-medium">Storage used</p>
            <p className="text-xs text-muted-foreground">
              {formatBytes(totalSize)} on this device
            </p>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : downloads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 rounded-full bg-card flex items-center justify-center mb-4">
              <Download className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No downloads yet</h2>
            <p className="text-muted-foreground text-sm max-w-xs">
              Download songs to listen offline. Look for the download button on tracks.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {downloads.map((track) => (
              <div
                key={track.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-card/50 hover:bg-card transition-colors group"
              >
                {/* Cover */}
                <button
                  onClick={() => handlePlay(track)}
                  className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0 group"
                >
                  {track.cover_url || track.album_cover ? (
                    <img
                      src={track.cover_url || track.album_cover}
                      alt={track.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <Music className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play className="w-6 h-6 text-white fill-white" />
                  </div>
                </button>

                {/* Info */}
                <div className="flex-1 min-w-0" onClick={() => handlePlay(track)}>
                  <h3 className="font-medium truncate">{track.title}</h3>
                  <p className="text-sm text-muted-foreground truncate">{track.artist_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDuration(track.duration_ms)} • {track.size ? formatBytes(track.size) : ""}
                  </p>
                </div>

                {/* Remove button */}
                <button
                  onClick={() => handleRemove(track.id)}
                  disabled={removingId === track.id}
                  className="p-2 rounded-full hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                >
                  {removingId === track.id ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Trash2 className="w-5 h-5" />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Downloads;
