import { useState } from "react";
import { Music, Users, Clock, TrendingUp, BarChart3, ChevronRight } from "lucide-react";
import { useListeningStats } from "@/hooks/useListeningStats";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";

interface ListeningStatsProps {
  userId: string;
  userName?: string;
  isOwnProfile?: boolean;
}

type Period = "week" | "month" | "allTime";

const periodLabels: Record<Period, string> = {
  week: "This Week",
  month: "This Month",
  allTime: "All Time",
};

export function ListeningStats({ userId, userName = "User", isOwnProfile = true }: ListeningStatsProps) {
  const [period, setPeriod] = useState<Period>("month");
  const { topTracks, topArtists, topGenres, totalListeningTime, totalTracks, isLoading } = useListeningStats(userId, period);

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  return (
    <div className="space-y-4">
      {/* Period Selector */}
      <div className="flex gap-2">
        {(Object.keys(periodLabels) as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium transition-all",
              period === p
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:bg-card/80"
            )}
          >
            {periodLabels[p]}
          </button>
        ))}
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass rounded-2xl p-4 text-center">
          <Clock className="w-5 h-5 mx-auto mb-2 text-primary" />
          {isLoading ? (
            <Skeleton className="h-6 w-16 mx-auto" />
          ) : (
            <p className="text-xl font-bold">{formatTime(totalListeningTime)}</p>
          )}
          <p className="text-xs text-muted-foreground">Listening Time</p>
        </div>
        <div className="glass rounded-2xl p-4 text-center">
          <Music className="w-5 h-5 mx-auto mb-2 text-primary" />
          {isLoading ? (
            <Skeleton className="h-6 w-16 mx-auto" />
          ) : (
            <p className="text-xl font-bold">{totalTracks}</p>
          )}
          <p className="text-xs text-muted-foreground">Tracks Played</p>
        </div>
      </div>

      {/* Top Genres */}
      {!isLoading && topGenres.length > 0 && (
        <div className="glass rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm">Top Genres</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {topGenres.map((genre, index) => (
              <div
                key={genre.name}
                className="px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5"
                style={{
                  backgroundColor: `${genre.color}20`,
                  color: genre.color,
                }}
              >
                <span className="opacity-60">#{index + 1}</span>
                <span>{genre.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Artists */}
      <Sheet>
        <SheetTrigger asChild>
          <button className="w-full glass rounded-2xl p-4 text-left hover:bg-card/60 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-sm">Top Artists</h3>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
            {isLoading ? (
              <div className="flex gap-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="w-12 h-12 rounded-full" />
                ))}
              </div>
            ) : (
              <div className="flex -space-x-2">
                {topArtists.slice(0, 5).map((artist, index) => (
                  <div
                    key={artist.name}
                    className="w-10 h-10 rounded-full bg-card border-2 border-background flex items-center justify-center overflow-hidden"
                    style={{ zIndex: 5 - index }}
                  >
                    {artist.cover ? (
                      <img
                        src={artist.cover}
                        alt={artist.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <span className="text-xs font-bold">
                        {artist.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                ))}
                {topArtists.length > 5 && (
                  <div className="w-10 h-10 rounded-full bg-primary/20 border-2 border-background flex items-center justify-center text-xs font-bold text-primary">
                    +{topArtists.length - 5}
                  </div>
                )}
              </div>
            )}
          </button>
        </SheetTrigger>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[70vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Top Artists - {periodLabels[period]}</SheetTitle>
          </SheetHeader>
          <div className="py-4 space-y-2">
            {topArtists.map((artist, index) => (
              <div key={artist.name} className="flex items-center gap-3 p-3 rounded-xl hover:bg-card/50">
                <span className="w-6 text-center text-sm font-bold text-muted-foreground">
                  {index + 1}
                </span>
                <div className="w-12 h-12 rounded-full bg-card flex items-center justify-center overflow-hidden">
                  {artist.cover ? (
                    <img
                      src={artist.cover}
                      alt={artist.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <Users className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{artist.name}</p>
                  <p className="text-xs text-muted-foreground">{artist.playCount} plays</p>
                </div>
              </div>
            ))}
            {topArtists.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No listening data for this period
              </p>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Top Tracks */}
      <Sheet>
        <SheetTrigger asChild>
          <button className="w-full glass rounded-2xl p-4 text-left hover:bg-card/60 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-sm">Top Tracks</h3>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-10 w-full rounded-lg" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {topTracks.slice(0, 3).map((track, index) => (
                  <div key={track.trackId} className="flex items-center gap-2">
                    <span className="w-5 text-xs font-bold text-muted-foreground">
                      #{index + 1}
                    </span>
                    <div className="w-8 h-8 rounded bg-card overflow-hidden flex-shrink-0">
                      {track.cover ? (
                        <img
                          src={track.cover}
                          alt={track.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Music className="w-3 h-3 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{track.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </button>
        </SheetTrigger>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[70vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Top Tracks - {periodLabels[period]}</SheetTitle>
          </SheetHeader>
          <div className="py-4 space-y-2">
            {topTracks.map((track, index) => (
              <div key={track.trackId} className="flex items-center gap-3 p-3 rounded-xl hover:bg-card/50">
                <span className="w-6 text-center text-sm font-bold text-muted-foreground">
                  {index + 1}
                </span>
                <div className="w-12 h-12 rounded-lg bg-card overflow-hidden flex-shrink-0">
                  {track.cover ? (
                    <img
                      src={track.cover}
                      alt={track.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Music className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{track.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
                </div>
                <span className="text-xs text-muted-foreground">{track.playCount}x</span>
              </div>
            ))}
            {topTracks.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No listening data for this period
              </p>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
