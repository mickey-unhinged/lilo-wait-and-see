import { useState, useEffect, useCallback } from "react";
import { Users, Loader2, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { FriendStatsSheet } from "@/components/profile/FriendStatsSheet";

interface Activity {
  user_id: string;
  track_title: string;
  track_artist: string;
  track_cover: string | null;
  track_source?: string | null;
  played_at: string;
  profile?: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
}

export function FriendsActivity() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [followedIds, setFollowedIds] = useState<string[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUserId(session?.user?.id || null);
    });
  }, []);

  const fetchFriendsActivity = useCallback(async (followingIds: string[]) => {
    if (followingIds.length === 0) {
      setActivities([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("listening_activity")
        .select("user_id, track_id, track_title, track_artist, track_cover, track_source, played_at")
        .in("user_id", followingIds)
        .order("played_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      
      const rows = data || [];
      const userIds = rows.map((row: any) => row.user_id);
      
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .in("id", userIds);

      const profilesData = profiles || [];
      
      setActivities(
        rows.map((row: any) => ({
          user_id: row.user_id,
          track_title: row.track_title,
          track_artist: row.track_artist || "Unknown Artist",
          track_cover: row.track_cover,
          track_source: row.track_source,
          played_at: row.played_at,
          profile: profilesData.find((profile: any) => profile.id === row.user_id),
        }))
      );
    } catch (error) {
      console.error("Failed to fetch friends activity:", error);
      setActivities([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadFollowing = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_follows")
        .select("following_id")
        .eq("follower_id", userId);

      if (error) throw error;

      const ids = data?.map((f) => f.following_id) || [];
      setFollowedIds(ids);
      fetchFriendsActivity(ids);
    } catch (error) {
      console.error("Failed to load following users:", error);
      setFollowedIds([]);
      setActivities([]);
      setIsLoading(false);
    }
  }, [fetchFriendsActivity]);

  useEffect(() => {
    if (currentUserId) {
      loadFollowing(currentUserId);
    } else {
      setIsLoading(false);
    }
  }, [currentUserId, loadFollowing]);

  // Subscribe to realtime listening updates from followed users
  useEffect(() => {
    if (!currentUserId || followedIds.length === 0) return;

    const channel = supabase
      .channel("listening-activity-feed")
      .on(
        "postgres_changes" as any,
        {
          event: "INSERT",
          schema: "public",
          table: "listening_activity",
        },
        (payload: any) => {
          const newUserId = payload.new?.user_id;
          if (newUserId && followedIds.includes(newUserId)) {
            fetchFriendsActivity(followedIds);
          }
        }
      )
      .on(
        "postgres_changes" as any,
        {
          event: "UPDATE",
          schema: "public",
          table: "listening_activity",
        },
        (payload: any) => {
          const updatedUserId = payload.new?.user_id;
          if (updatedUserId && followedIds.includes(updatedUserId)) {
            fetchFriendsActivity(followedIds);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, followedIds, fetchFriendsActivity]);

  if (!currentUserId) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="py-4">
        <h2 className="text-xl font-bold font-display mb-4 px-4">Friends Activity</h2>
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="py-4">
        <h2 className="text-xl font-bold font-display mb-4 px-4">Friends Activity</h2>
        <div className="text-center py-8 px-4">
          <Users className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground text-sm">
            Follow friends to see what they're listening to
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-4">
      <h2 className="text-xl font-bold font-display mb-4 px-4">Friends Activity</h2>
      <div className="space-y-3 px-4">
        {activities.map((activity, index) => (
          <FriendStatsSheet key={`${activity.user_id}-${activity.played_at}-${index}`} friendId={activity.user_id}>
            <button className="w-full flex items-center gap-3 p-3 rounded-xl bg-card/30 hover:bg-card/50 transition-colors text-left">
              <Avatar className="w-10 h-10">
                <AvatarImage src={activity.profile?.avatar_url || undefined} />
                <AvatarFallback>
                  {(activity.profile?.display_name || activity.profile?.username || "U")[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate flex items-center gap-1">
                  {activity.profile?.display_name || activity.profile?.username || "Someone"}
                  <BarChart3 className="w-3 h-3 text-muted-foreground" />
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {activity.track_title} • {activity.track_artist}
                </p>
                <p className="text-xs text-muted-foreground/70">
                  {formatDistanceToNow(new Date(activity.played_at), { addSuffix: true })}
                </p>
              </div>

              {activity.track_cover && (
                <img
                  src={activity.track_cover}
                  alt={activity.track_title}
                  className="w-12 h-12 rounded-lg object-cover"
                />
              )}
            </button>
          </FriendStatsSheet>
        ))}
      </div>
    </div>
  );
}
