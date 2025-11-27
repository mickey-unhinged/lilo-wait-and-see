import { Play } from "lucide-react";
import { cn } from "@/lib/utils";

interface TrackCardProps {
  title: string;
  artist: string;
  imageUrl: string;
  isPlaying?: boolean;
  variant?: "default" | "large";
  onClick?: () => void;
}

export function TrackCard({ 
  title, 
  artist, 
  imageUrl, 
  isPlaying = false,
  variant = "default",
  onClick 
}: TrackCardProps) {
  const isLarge = variant === "large";
  
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
          className={cn(
            "object-cover rounded-2xl transition-all duration-300 group-hover:shadow-lg",
            isLarge ? "w-44 h-44" : "w-36 h-36"
          )}
        />
        
        {/* Hover overlay */}
        <div className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform glow-primary">
            <Play className="w-5 h-5 text-primary-foreground ml-0.5" fill="currentColor" />
          </div>
        </div>
        
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
