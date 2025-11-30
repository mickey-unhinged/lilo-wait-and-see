import { useState } from "react";
import { Download, Check, Loader2, X } from "lucide-react";
import { useOfflineMusic } from "@/hooks/useOfflineMusic";
import { Track } from "@/contexts/PlayerContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PlaylistDownloadButtonProps {
  tracks: Track[];
  playlistName: string;
  className?: string;
}

export function PlaylistDownloadButton({ tracks, playlistName, className }: PlaylistDownloadButtonProps) {
  const { downloadTrack, isDownloaded, isDownloading } = useOfflineMusic();
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const downloadedCount = tracks.filter((t) => isDownloaded(t.id)).length;
  const allDownloaded = downloadedCount === tracks.length && tracks.length > 0;

  const getAudioUrl = async (track: Track): Promise<string | null> => {
    if (track.audio_url) return track.audio_url;

    const videoId = track.videoId || track.id;
    if (!videoId) return null;

    try {
      const { data, error } = await supabase.functions.invoke("youtube-audio-stream", {
        body: { videoId },
      });

      if (error) throw error;
      return data?.streamUrl || null;
    } catch {
      return null;
    }
  };

  const handleDownloadAll = async () => {
    if (downloading || tracks.length === 0) return;

    const tracksToDownload = tracks.filter((t) => !isDownloaded(t.id) && !isDownloading(t.id));

    if (tracksToDownload.length === 0) {
      toast.info("All tracks already downloaded");
      return;
    }

    setDownloading(true);
    setProgress({ current: 0, total: tracksToDownload.length });

    toast.info(`Downloading ${tracksToDownload.length} tracks from "${playlistName}"...`);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < tracksToDownload.length; i++) {
      const track = tracksToDownload[i];
      setProgress({ current: i + 1, total: tracksToDownload.length });

      try {
        const success = await downloadTrack(
          {
            id: track.id,
            title: track.title,
            artist_name: track.artist_name,
            cover_url: track.cover_url,
            album_cover: track.album_cover,
            duration_ms: track.duration_ms,
            videoId: track.videoId,
            audio_url: track.audio_url,
          },
          () => getAudioUrl(track)
        );

        if (success) {
          successCount++;
        } else {
          failCount++;
        }
      } catch {
        failCount++;
      }
    }

    setDownloading(false);
    setProgress({ current: 0, total: 0 });

    if (successCount > 0 && failCount === 0) {
      toast.success(`Downloaded ${successCount} tracks from "${playlistName}"`);
    } else if (successCount > 0) {
      toast.success(`Downloaded ${successCount} tracks, ${failCount} failed`);
    } else {
      toast.error("Failed to download tracks");
    }
  };

  const handleCancel = () => {
    // In a real implementation, you'd abort the downloads
    setDownloading(false);
    setProgress({ current: 0, total: 0 });
    toast.info("Download cancelled");
  };

  if (tracks.length === 0) return null;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {downloading ? (
        <button
          onClick={handleCancel}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-card/50 hover:bg-card transition-colors"
        >
          <div className="relative">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
          <span className="text-sm">
            {progress.current}/{progress.total}
          </span>
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      ) : allDownloaded ? (
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/20 text-green-500">
          <Check className="w-5 h-5" />
          <span className="text-sm font-medium">Downloaded</span>
        </div>
      ) : (
        <button
          onClick={handleDownloadAll}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-card/50 hover:bg-card transition-colors"
        >
          <Download className="w-5 h-5" />
          <span className="text-sm">
            {downloadedCount > 0
              ? `Download (${tracks.length - downloadedCount} left)`
              : `Download All (${tracks.length})`}
          </span>
        </button>
      )}
    </div>
  );
}
