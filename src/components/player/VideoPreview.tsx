import { Video, VideoOff } from "lucide-react";

interface VideoPreviewProps {
  videoId?: string;
  title?: string;
}

export function VideoPreview({ videoId, title }: VideoPreviewProps) {
  if (!videoId) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12 text-muted-foreground">
        <VideoOff className="w-12 h-12 mb-4 opacity-50" />
        <p className="text-sm">Video not available</p>
        <p className="text-xs mt-1 opacity-70">Only YouTube Music tracks have video</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black/50">
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?autoplay=0&controls=1&modestbranding=1&rel=0`}
          title={title || "Video preview"}
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
      <p className="text-xs text-muted-foreground text-center mt-3">
        Video preview from YouTube
      </p>
    </div>
  );
}
