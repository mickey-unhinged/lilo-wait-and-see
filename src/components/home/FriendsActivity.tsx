import { useState, useEffect } from "react";
import { Users, Music, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";

interface Activity {
  user_id: string;
  track_title: string;
  track_artist: string;
  track_cover: string | null;
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUserId(session?.user?.id || null);
      if (session?.user?.id) {
        fetchFriendsActivity(session.user.id);
      } else {
        setIsLoading(false);
      }
    });
  }, []);

  // Subscribe to realtime play history updates
  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel("play-history-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "play_history",
        },
        () => {
          fetchFriendsActivity(currentUserId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  const fetchFriendsActivity = async (userId: string) => {
    setIsLoading(true);
    try {
      // Get following users
      const { data: following } = await supabase
        .from("user_follows")
        .select("following_id")
        .eq("follower_id", userId);

      if (!following || following.length === 0) {
        setActivities([]);
        return;
      }

      const followingIds = following.map((f) => f.following_id);

      // Get recent play history for following users
      const { data: playHistory } = await supabase
        .from("play_history")
        .select(`
          user_id,
          played_at,
          tracks (
            title,
            cover_url,
            artists (name)
          )
        `)
        .in("user_id", followingIds)
        .order("played_at", { ascending: false })
        .limit(10);

      if (!playHistory) {
        setActivities([]);
        return;
      }

      // Get profiles for these users
      const userIds = [...new Set(playHistory.map((p) => p.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .in("id", userIds);

      const activitiesWithProfiles = playHistory.map((play: any) => ({
        user_id: play.user_id,
        track_title: play.tracks?.title || "Unknown Track",
        track_artist: play.tracks?.artists?.name || "Unknown Artist",
        track_cover: play.tracks?.cover_url || null,
        played_at: play.played_at,
        profile: profiles?.find((p) => p.id === play.user_id),
      }));

      setActivities(activitiesWithProfiles);
    } catch (error) {
      console.error("Failed to fetch friends activity:", error);
    } finally {
      setIsLoading(false);
    }
  };

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
          <div
            key={`${activity.user_id}-${activity.played_at}-${index}`}
            className="flex items-center gap-3 p-3 rounded-xl bg-card/30 hover:bg-card/50 transition-colors"
          >
            <Avatar className="w-10 h-10">
              <AvatarImage src={activity.profile?.avatar_url || undefined} />
              <AvatarFallback>
                {(activity.profile?.display_name || activity.profile?.username || "U")[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {activity.profile?.display_name || activity.profile?.username || "Someone"}
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
          </div>
        ))}
      </div>
    </div>
  );
}
