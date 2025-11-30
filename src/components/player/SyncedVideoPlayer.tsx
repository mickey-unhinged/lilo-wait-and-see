import { useEffect, useRef, useState } from "react";
import { VideoOff, Loader2 } from "lucide-react";
import { usePlayer } from "@/contexts/PlayerContext";

interface SyncedVideoPlayerProps {
  videoId?: string;
  title?: string;
}

export function SyncedVideoPlayer({ videoId, title }: SyncedVideoPlayerProps) {
  const { progress, isPlaying, duration } = usePlayer();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [playerReady, setPlayerReady] = useState(false);
  const lastSyncRef = useRef<number>(0);

  // YouTube Player API script loading
  useEffect(() => {
    if (!videoId) return;

    // Check if YT API is already loaded
    if ((window as any).YT && (window as any).YT.Player) {
      setPlayerReady(true);
      return;
    }

    // Load YouTube IFrame API
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName("script")[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

    (window as any).onYouTubeIframeAPIReady = () => {
      setPlayerReady(true);
    };
  }, [videoId]);

  if (!videoId) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12 text-muted-foreground">
        <VideoOff className="w-12 h-12 mb-4 opacity-50" />
        <p className="text-sm">Video not available</p>
        <p className="text-xs mt-1 opacity-70">Only Lilo Live tracks include video playback</p>
      </div>
    );
  }

  // Calculate start time based on current progress
  const startTime = Math.floor(progress);

  return (
    <div className="w-full h-full flex flex-col">
      <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black/50">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}
        <iframe
          ref={iframeRef}
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&start=${startTime}&controls=1&modestbranding=1&rel=0&enablejsapi=1`}
          title={title || "Video preview"}
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          onLoad={() => setIsLoading(false)}
        />
      </div>
      <div className="flex items-center justify-between mt-3 px-2">
        <p className="text-xs text-muted-foreground">
          Video synced at {Math.floor(progress / 60)}:{String(Math.floor(progress % 60)).padStart(2, "0")}
        </p>
        <p className="text-xs text-muted-foreground">
          Powered by Lilo Live
        </p>
      </div>
    </div>
  );
}
