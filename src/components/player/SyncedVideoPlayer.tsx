import { useEffect, useRef, useState } from "react";
import { VideoOff, Loader2, Play, Pause, Volume2, VolumeX, Maximize } from "lucide-react";
import { usePlayer } from "@/contexts/PlayerContext";
import { cn } from "@/lib/utils";

interface SyncedVideoPlayerProps {
  videoId?: string;
  title?: string;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export function SyncedVideoPlayer({ videoId, title }: SyncedVideoPlayerProps) {
  const { progress, isPlaying } = usePlayer();
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [playerReady, setPlayerReady] = useState(false);
  const [isMuted, setIsMuted] = useState(true); // Start muted to avoid double audio
  const [showControls, setShowControls] = useState(false);
  const lastSyncRef = useRef<number>(0);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load YouTube IFrame API
  useEffect(() => {
    if (!videoId) return;

    if (window.YT && window.YT.Player) {
      initPlayer();
      return;
    }

    // Load YouTube IFrame API script
    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }

    window.onYouTubeIframeAPIReady = () => {
      initPlayer();
    };

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [videoId]);

  const initPlayer = () => {
    if (!containerRef.current || !videoId || playerRef.current) return;

    // Create a div for the player
    const playerDiv = document.createElement("div");
    playerDiv.id = `yt-player-${videoId}`;
    containerRef.current.innerHTML = "";
    containerRef.current.appendChild(playerDiv);

    playerRef.current = new window.YT.Player(playerDiv.id, {
      videoId: videoId,
      playerVars: {
        autoplay: 1,
        controls: 0,
        disablekb: 1,
        fs: 0,
        iv_load_policy: 3,
        modestbranding: 1,
        rel: 0,
        showinfo: 0,
        mute: 1,
        playsinline: 1,
        start: Math.floor(progress),
      },
      events: {
        onReady: (event: any) => {
          setIsLoading(false);
          setPlayerReady(true);
          event.target.mute();
          if (isPlaying) {
            event.target.playVideo();
          }
        },
        onStateChange: (event: any) => {
          // Keep video in sync with audio
        },
      },
    });
  };

  // Sync video playback with audio
  useEffect(() => {
    if (!playerReady || !playerRef.current) return;

    const syncVideo = () => {
      if (!playerRef.current || !playerRef.current.getCurrentTime) return;

      const videoTime = playerRef.current.getCurrentTime();
      const diff = Math.abs(videoTime - progress);

      // Only seek if more than 2 seconds out of sync
      if (diff > 2) {
        playerRef.current.seekTo(progress, true);
        lastSyncRef.current = progress;
      }
    };

    // Sync every 3 seconds
    syncIntervalRef.current = setInterval(syncVideo, 3000);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [playerReady, progress]);

  // Handle play/pause state
  useEffect(() => {
    if (!playerReady || !playerRef.current) return;

    try {
      if (isPlaying) {
        playerRef.current.playVideo();
      } else {
        playerRef.current.pauseVideo();
      }
    } catch (e) {
      // Player not ready yet
    }
  }, [isPlaying, playerReady]);

  const toggleMute = () => {
    if (!playerRef.current) return;
    if (isMuted) {
      playerRef.current.unMute();
      playerRef.current.setVolume(100);
    } else {
      playerRef.current.mute();
    }
    setIsMuted(!isMuted);
  };

  const handleFullscreen = () => {
    if (containerRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        containerRef.current.requestFullscreen();
      }
    }
  };

  if (!videoId) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12 text-muted-foreground">
        <VideoOff className="w-12 h-12 mb-4 opacity-50" />
        <p className="text-sm">Video not available</p>
        <p className="text-xs mt-1 opacity-70">Only Lilo Live tracks include video playback</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      <div 
        className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black/80 group"
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => setShowControls(false)}
      >
        {/* Video Container */}
        <div 
          ref={containerRef} 
          className="absolute inset-0 w-full h-full [&>div]:w-full [&>div]:h-full [&_iframe]:w-full [&_iframe]:h-full"
        />

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-10">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Loading video...</span>
            </div>
          </div>
        )}

        {/* Custom Lilo Live Overlay */}
        <div className={cn(
          "absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 transition-opacity duration-300 z-20 pointer-events-none",
          showControls || !isPlaying ? "opacity-100" : "opacity-0"
        )}>
          {/* Top Bar */}
          <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between pointer-events-auto">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-xs font-medium text-white/90 tracking-wider uppercase">
                Lilo Live
              </span>
            </div>
          </div>

          {/* Bottom Controls */}
          <div className="absolute bottom-0 left-0 right-0 p-4 pointer-events-auto">
            {/* Progress indicator */}
            <div className="mb-3">
              <div className="h-1 bg-white/20 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all"
                  style={{ width: `${(progress / 300) * 100}%` }}
                />
              </div>
            </div>

            {/* Controls Row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={toggleMute}
                  className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center hover:bg-white/20 transition-colors"
                >
                  {isMuted ? (
                    <VolumeX className="w-5 h-5 text-white" />
                  ) : (
                    <Volume2 className="w-5 h-5 text-white" />
                  )}
                </button>
                <span className="text-xs text-white/70">
                  {isMuted ? "Video muted (audio from player)" : "Video audio on"}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleFullscreen}
                  className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center hover:bg-white/20 transition-colors"
                >
                  <Maximize className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            {/* Title */}
            <p className="text-sm font-medium text-white mt-3 truncate">
              {title || "Now Playing"}
            </p>
          </div>
        </div>

        {/* Decorative Corners */}
        <div className="absolute top-3 left-3 w-6 h-6 border-l-2 border-t-2 border-primary/50 rounded-tl-lg pointer-events-none z-20" />
        <div className="absolute top-3 right-3 w-6 h-6 border-r-2 border-t-2 border-primary/50 rounded-tr-lg pointer-events-none z-20" />
        <div className="absolute bottom-3 left-3 w-6 h-6 border-l-2 border-b-2 border-primary/50 rounded-bl-lg pointer-events-none z-20" />
        <div className="absolute bottom-3 right-3 w-6 h-6 border-r-2 border-b-2 border-primary/50 rounded-br-lg pointer-events-none z-20" />
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between mt-3 px-2">
        <p className="text-xs text-muted-foreground">
          Synced at {Math.floor(progress / 60)}:{String(Math.floor(progress % 60)).padStart(2, "0")}
        </p>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          <p className="text-xs font-medium text-primary">
            Lilo Live
          </p>
        </div>
      </div>
    </div>
  );
}
