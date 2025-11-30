import { Play, Download, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useOfflineMusic } from "@/hooks/useOfflineMusic";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Track } from "@/contexts/PlayerContext";

interface TrackCardProps {
  title: string;
  artist: string;
  imageUrl: string;
  isPlaying?: boolean;
  variant?: "default" | "large";
  onClick?: () => void;
  track?: Track;
  showDownload?: boolean;
}

export function TrackCard({ 
  title, 
  artist, 
  imageUrl, 
  isPlaying = false,
  variant = "default",
  onClick,
  track,
  showDownload = false,
}: TrackCardProps) {
  const isLarge = variant === "large";
  const { downloadTrack, isDownloaded, isDownloading } = useOfflineMusic();
  const { toast } = useToast();
  const [downloaded, setDownloaded] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (track) {
      setDownloaded(isDownloaded(track.id));
      setDownloading(isDownloading(track.id));
    }
  }, [track, isDownloaded, isDownloading]);

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!track || downloading || downloaded) return;

    setDownloading(true);
    toast({ title: "Downloading...", description: track.title });

    const success = await downloadTrack(track, async () => {
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
      toast({ title: "Download failed", variant: "destructive" });
    }
  };
  
  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex flex-col text-left transition-all duration-300",
        isLarge ? "w-44" : "w-36"
      )}
    >
      {/* Image container */}
      <div className="relative mb-3">
        <img
          src={imageUrl}
          alt={title}
          loading="lazy"
          onError={(e) => {
            // Fallback to placeholder on error
            const target = e.target as HTMLImageElement;
            target.src = "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200&h=200&fit=crop";
          }}
          className={cn(
            "object-cover rounded-2xl transition-all duration-300 group-hover:shadow-lg bg-card/50",
            isLarge ? "w-44 h-44" : "w-36 h-36"
          )}
        />
        
        {/* Hover overlay */}
        <div className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform glow-primary">
            <Play className="w-5 h-5 text-primary-foreground ml-0.5" fill="currentColor" />
          </div>
        </div>
        
        {/* Download button */}
        {showDownload && track && (
          <button
            onClick={handleDownload}
            className={cn(
              "absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 z-10",
              downloaded ? "bg-primary/90 text-primary-foreground" : "bg-black/60 text-white hover:bg-black/80"
            )}
          >
            {downloading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : downloaded ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
          </button>
        )}
        
        {/* Playing indicator */}
        {isPlaying && (
          <div className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-lg glow-primary">
            <div className="flex items-center gap-0.5">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="w-0.5 bg-primary-foreground rounded-full animate-wave"
                  style={{
                    height: "12px",
                    animationDelay: `${i * 0.15}s`,
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Info */}
      <h3 className="font-medium text-sm truncate">{title}</h3>
      <p className="text-xs text-muted-foreground truncate">{artist}</p>
    </button>
  );
}
