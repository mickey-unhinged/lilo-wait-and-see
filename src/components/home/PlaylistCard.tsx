import { Play, Music } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlaylistCardProps {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  trackCount?: number;
  onClick: () => void;
  variant?: "default" | "large";
}

export function PlaylistCard({
  title,
  description,
  imageUrl,
  trackCount,
  onClick,
  variant = "default",
}: PlaylistCardProps) {
  const isLarge = variant === "large";

  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex-shrink-0 text-left transition-all duration-300 hover:scale-[1.02]",
        isLarge ? "w-44" : "w-36"
      )}
    >
      {/* Cover */}
      <div
        className={cn(
          "relative rounded-2xl overflow-hidden mb-3 shadow-lg",
          isLarge ? "aspect-square" : "aspect-square"
        )}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full gradient-bg flex items-center justify-center">
            <Music className="w-10 h-10 text-primary-foreground/80" />
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        {/* Play button */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
          <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
            <Play className="w-6 h-6 text-primary-foreground ml-1" fill="currentColor" />
          </div>
        </div>

        {/* Track count badge */}
        {trackCount !== undefined && (
          <div className="absolute bottom-2 left-2 px-2 py-1 rounded-full bg-black/60 backdrop-blur-sm">
            <span className="text-xs text-white font-medium">{trackCount} tracks</span>
          </div>
        )}
      </div>

      {/* Info */}
      <h3 className="font-semibold text-sm truncate mb-1">{title}</h3>
      {description && (
        <p className="text-xs text-muted-foreground truncate">{description}</p>
      )}
    </button>
  );
}
