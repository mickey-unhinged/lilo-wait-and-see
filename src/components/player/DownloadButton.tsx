import { useState, useEffect } from "react";
import { Download, Check, Loader2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOfflineMusic } from "@/hooks/useOfflineMusic";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Track } from "@/contexts/PlayerContext";

interface DownloadButtonProps {
  track: Track;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

export function DownloadButton({ track, size = "md", showLabel = false, className }: DownloadButtonProps) {
  const { downloadTrack, removeDownload, isDownloaded, isDownloading } = useOfflineMusic();
  const { toast } = useToast();
  const [downloaded, setDownloaded] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    setDownloaded(isDownloaded(track.id));
    setDownloading(isDownloading(track.id));
  }, [track.id, isDownloaded, isDownloading]);

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (downloaded) {
      const success = await removeDownload(track.id);
      if (success) {
        setDownloaded(false);
        toast({ title: "Removed from downloads" });
      }
      return;
    }

    if (downloading) return;

    setDownloading(true);
    toast({ title: "Downloading...", description: track.title });

    const success = await downloadTrack(track, async () => {
      // Get audio URL if needed
      if (track.audio_url) return track.audio_url;
      
      if (track.videoId) {
        try {
          const { data, error } = await supabase.functions.invoke("youtube-audio-stream", {
            body: { videoId: track.videoId },
          });
          if (!error && data?.audioUrl) return data.audioUrl;
        } catch (err) {
          console.error("Failed to get audio URL:", err);
        }
      }
      return null;
    });

    setDownloading(false);
    
    if (success) {
      setDownloaded(true);
      toast({ title: "Downloaded!", description: `${track.title} is now available offline` });
    } else {
      toast({ title: "Download failed", description: "Could not download this track", variant: "destructive" });
    }
  };

  const iconSize = size === "sm" ? "w-4 h-4" : size === "lg" ? "w-6 h-6" : "w-5 h-5";
  const buttonSize = size === "sm" ? "p-1.5" : size === "lg" ? "p-3" : "p-2";

  return (
    <button
      onClick={handleClick}
      disabled={downloading}
      className={cn(
        "rounded-full transition-all duration-200",
        downloaded ? "bg-primary/20 text-primary" : "bg-card/50 text-muted-foreground hover:text-foreground hover:bg-card",
        buttonSize,
        className
      )}
      title={downloaded ? "Remove download" : "Download for offline"}
    >
      {downloading ? (
        <Loader2 className={cn(iconSize, "animate-spin")} />
      ) : downloaded ? (
        <Check className={iconSize} />
      ) : (
        <Download className={iconSize} />
      )}
      {showLabel && (
        <span className="ml-2 text-sm">
          {downloading ? "Downloading..." : downloaded ? "Downloaded" : "Download"}
        </span>
      )}
    </button>
  );
}
