import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Users, ArrowLeft, Music, BarChart3, Percent, Clock, TrendingUp, Loader2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { FriendStatsSheet } from "@/components/profile/FriendStatsSheet";
import { cn } from "@/lib/utils";

interface Friend {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  lastActivity?: {
    track_title: string;
    track_artist: string;
    track_cover: string | null;
    played_at: string;
  };
  sharedTaste?: number;
  topGenres?: string[];
}

type Tab = "activity" | "friends";

const Friends = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("activity");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userTopArtists, setUserTopArtists] = useState<string[]>([]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id || null);
      if (user?.id) {
        loadUserTopArtists(user.id);
      }
    });
  }, []);

  const loadUserTopArtists = async (userId: string) => {
    try {
      const { data } = await supabase
        .from("listening_activity")
        .select("track_artist")
        .eq("user_id", userId)
        .order("played_at", { ascending: false })
        .limit(100);

      if (data) {
        const artistCounts: Record<string, number> = {};
        data.forEach((row) => {
          if (row.track_artist) {
            artistCounts[row.track_artist] = (artistCounts[row.track_artist] || 0) + 1;
          }
        });
        const topArtists = Object.entries(artistCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 20)
          .map(([artist]) => artist);
        setUserTopArtists(topArtists);
      }
    } catch (error) {
      console.error("Failed to load user top artists:", error);
    }
  };

  const calculateSharedTaste = useCallback(async (friendId: string): Promise<number> => {
    if (userTopArtists.length === 0) return 0;

    try {
      const { data } = await supabase
        .from("listening_activity")
        .select("track_artist")
        .eq("user_id", friendId)
        .order("played_at", { ascending: false })
        .limit(100);

      if (!data || data.length === 0) return 0;

      const friendArtistCounts: Record<string, number> = {};
      data.forEach((row) => {
        if (row.track_artist) {
          friendArtistCounts[row.track_artist] = (friendArtistCounts[row.track_artist] || 0) + 1;
        }
      });

      const friendTopArtists = Object.entries(friendArtistCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 20)
        .map(([artist]) => artist);

      const sharedArtists = userTopArtists.filter((artist) =>
        friendTopArtists.includes(artist)
      );

      return Math.round((sharedArtists.length / Math.max(userTopArtists.length, 1)) * 100);
    } catch {
      return 0;
    }
  }, [userTopArtists]);

  const loadFriends = useCallback(async (userId: string) => {
    setIsLoading(true);
    try {
      // Get followed users
      const { data: follows, error } = await supabase
        .from("user_follows")
        .select("following_id")
        .eq("follower_id", userId);

      if (error) throw error;

      const friendIds = follows?.map((f) => f.following_id) || [];

      if (friendIds.length === 0) {
        setFriends([]);
        setIsLoading(false);
        return;
      }

      // Get profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .in("id", friendIds);

      // Get latest activity for each friend
      const { data: activities } = await supabase
        .from("listening_activity")
        .select("user_id, track_title, track_artist, track_cover, played_at")
        .in("user_id", friendIds)
        .order("played_at", { ascending: false });

      const latestActivityByUser: Record<string, any> = {};
      activities?.forEach((activity) => {
        if (!latestActivityByUser[activity.user_id]) {
          latestActivityByUser[activity.user_id] = activity;
        }
      });

      // Build friends list with shared taste calculation
      const friendsList: Friend[] = await Promise.all(
        (profiles || []).map(async (profile) => {
          const sharedTaste = await calculateSharedTaste(profile.id);
          return {
            id: profile.id,
            username: profile.username,
            display_name: profile.display_name,
            avatar_url: profile.avatar_url,
            lastActivity: latestActivityByUser[profile.id]
              ? {
                  track_title: latestActivityByUser[profile.id].track_title,
                  track_artist: latestActivityByUser[profile.id].track_artist,
                  track_cover: latestActivityByUser[profile.id].track_cover,
                  played_at: latestActivityByUser[profile.id].played_at,
                }
              : undefined,
            sharedTaste,
          };
        })
      );

      // Sort by shared taste
      friendsList.sort((a, b) => (b.sharedTaste || 0) - (a.sharedTaste || 0));
      setFriends(friendsList);
    } catch (error) {
      console.error("Failed to load friends:", error);
      setFriends([]);
    } finally {
      setIsLoading(false);
    }
  }, [calculateSharedTaste]);

  useEffect(() => {
    if (currentUserId && userTopArtists.length > 0) {
      loadFriends(currentUserId);
    } else if (currentUserId && userTopArtists.length === 0) {
      // Still load friends even without top artists
      setTimeout(() => {
        if (userTopArtists.length === 0) {
          loadFriends(currentUserId);
        }
      }, 1000);
    }
  }, [currentUserId, userTopArtists, loadFriends]);

  const getTasteColor = (percentage: number) => {
    if (percentage >= 70) return "text-green-500";
    if (percentage >= 40) return "text-yellow-500";
    return "text-muted-foreground";
  };

  if (!currentUserId) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4">
          <Users className="w-16 h-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-bold mb-2">Sign in to see friends</h2>
          <p className="text-muted-foreground mb-4">Connect with others and discover music together</p>
          <button
            onClick={() => navigate("/auth")}
            className="px-6 py-3 rounded-full gradient-bg text-primary-foreground font-medium"
          >
            Sign In
          </button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {/* Header */}
      <div className="px-4 pt-12 pb-4">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-full hover:bg-card/50 transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-2xl font-bold font-display">Friends</h1>
            <p className="text-sm text-muted-foreground">{friends.length} friends</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab("activity")}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium transition-all",
              tab === "activity"
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:bg-card/80"
            )}
          >
            Activity
          </button>
          <button
            onClick={() => setTab("friends")}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium transition-all",
              tab === "friends"
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:bg-card/80"
            )}
          >
            All Friends
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-24">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : friends.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="w-16 h-16 text-muted-foreground mb-4" />
            <h2 className="text-lg font-semibold mb-2">No friends yet</h2>
            <p className="text-muted-foreground text-sm mb-4">
              Search for users and follow them to see their activity
            </p>
            <button
              onClick={() => navigate("/profile")}
              className="px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium"
            >
              Find Friends
            </button>
          </div>
        ) : tab === "activity" ? (
          <div className="space-y-3">
            {friends
              .filter((f) => f.lastActivity)
              .sort((a, b) => {
                const aTime = a.lastActivity ? new Date(a.lastActivity.played_at).getTime() : 0;
                const bTime = b.lastActivity ? new Date(b.lastActivity.played_at).getTime() : 0;
                return bTime - aTime;
              })
              .map((friend) => (
                <FriendStatsSheet key={friend.id} friendId={friend.id}>
                  <button className="w-full glass rounded-2xl p-4 text-left hover:bg-card/50 transition-colors">
                    <div className="flex items-start gap-3">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={friend.avatar_url || undefined} />
                        <AvatarFallback>
                          {(friend.display_name || friend.username || "U")[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium truncate">
                            {friend.display_name || friend.username || "User"}
                          </p>
                          {friend.sharedTaste !== undefined && friend.sharedTaste > 0 && (
                            <span className={cn("text-xs flex items-center gap-0.5", getTasteColor(friend.sharedTaste))}>
                              <Percent className="w-3 h-3" />
                              {friend.sharedTaste}
                            </span>
                          )}
                        </div>

                        {friend.lastActivity && (
                          <div className="flex items-center gap-2">
                            {friend.lastActivity.track_cover && (
                              <img
                                src={friend.lastActivity.track_cover}
                                alt=""
                                className="w-10 h-10 rounded-lg object-cover"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm truncate">{friend.lastActivity.track_title}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {friend.lastActivity.track_artist}
                              </p>
                            </div>
                          </div>
                        )}

                        <p className="text-xs text-muted-foreground/70 mt-2 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {friend.lastActivity
                            ? formatDistanceToNow(new Date(friend.lastActivity.played_at), { addSuffix: true })
                            : "No recent activity"}
                        </p>
                      </div>

                      <BarChart3 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    </div>
                  </button>
                </FriendStatsSheet>
              ))}
          </div>
        ) : (
          <div className="space-y-3">
            {friends.map((friend) => (
              <FriendStatsSheet key={friend.id} friendId={friend.id}>
                <button className="w-full glass rounded-2xl p-4 text-left hover:bg-card/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <Avatar className="w-14 h-14">
                      <AvatarImage src={friend.avatar_url || undefined} />
                      <AvatarFallback className="text-lg">
                        {(friend.display_name || friend.username || "U")[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">
                        {friend.display_name || friend.username || "User"}
                      </p>
                      {friend.username && friend.display_name && (
                        <p className="text-xs text-muted-foreground">@{friend.username}</p>
                      )}

                      {/* Shared taste indicator */}
                      {friend.sharedTaste !== undefined && (
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex-1 h-2 bg-card rounded-full overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all",
                                friend.sharedTaste >= 70
                                  ? "bg-green-500"
                                  : friend.sharedTaste >= 40
                                  ? "bg-yellow-500"
                                  : "bg-muted-foreground"
                              )}
                              style={{ width: `${friend.sharedTaste}%` }}
                            />
                          </div>
                          <span className={cn("text-xs font-medium", getTasteColor(friend.sharedTaste))}>
                            {friend.sharedTaste}% match
                          </span>
                        </div>
                      )}
                    </div>

                    <TrendingUp className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  </div>
                </button>
              </FriendStatsSheet>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Friends;
