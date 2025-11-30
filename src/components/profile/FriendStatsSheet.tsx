import { useState, useEffect } from "react";
import { User, Music, Clock, BarChart3, TrendingUp, Users } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useListeningStats } from "@/hooks/useListeningStats";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface FriendStatsSheetProps {
  friendId: string;
  children: React.ReactNode;
}

type Period = "week" | "month" | "allTime";

const periodLabels: Record<Period, string> = {
  week: "This Week",
  month: "This Month",
  allTime: "All Time",
};

export function FriendStatsSheet({ friendId, children }: FriendStatsSheetProps) {
  const [period, setPeriod] = useState<Period>("month");
  const [profile, setProfile] = useState<any>(null);
  const [isOpen, setIsOpen] = useState(false);
  const { topTracks, topArtists, topGenres, totalListeningTime, totalTracks, isLoading } = useListeningStats(
    isOpen ? friendId : undefined,
    period
  );

  useEffect(() => {
    if (isOpen && friendId) {
      supabase
        .from("profiles")
        .select("display_name, username, avatar_url")
        .eq("id", friendId)
        .maybeSingle()
        .then(({ data }) => setProfile(data));
    }
  }, [isOpen, friendId]);

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const displayName = profile?.display_name || profile?.username || "User";

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-card overflow-hidden flex items-center justify-center">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <User className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
            <span>{displayName}'s Stats</span>
          </SheetTitle>
        </SheetHeader>

        <div className="py-4 space-y-4">
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
          <div className="glass rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-sm">Top Artists</h3>
            </div>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-lg" />
                ))}
              </div>
            ) : topArtists.length > 0 ? (
              <div className="space-y-2">
                {topArtists.slice(0, 5).map((artist, index) => (
                  <div key={artist.name} className="flex items-center gap-3 p-2 rounded-lg hover:bg-card/50">
                    <span className="w-5 text-xs font-bold text-muted-foreground">#{index + 1}</span>
                    <div className="w-10 h-10 rounded-full bg-card flex items-center justify-center overflow-hidden">
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
                        <span className="text-xs font-bold">{artist.name.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{artist.name}</p>
                      <p className="text-xs text-muted-foreground">{artist.playCount} plays</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No data available</p>
            )}
          </div>

          {/* Top Tracks */}
          <div className="glass rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-sm">Top Tracks</h3>
            </div>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-lg" />
                ))}
              </div>
            ) : topTracks.length > 0 ? (
              <div className="space-y-2">
                {topTracks.slice(0, 5).map((track, index) => (
                  <div key={track.trackId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-card/50">
                    <span className="w-5 text-xs font-bold text-muted-foreground">#{index + 1}</span>
                    <div className="w-10 h-10 rounded-lg bg-card overflow-hidden flex-shrink-0">
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
                          <Music className="w-4 h-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{track.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{track.playCount}x</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No data available</p>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
