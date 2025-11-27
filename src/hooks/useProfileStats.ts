import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ProfileStats {
  playlists: number;
  followers: number;
  following: number;
  isLoading: boolean;
}

export function useProfileStats(userId: string | undefined) {
  const [stats, setStats] = useState<ProfileStats>({
    playlists: 0,
    followers: 0,
    following: 0,
    isLoading: true,
  });

  useEffect(() => {
    if (!userId) {
      setStats({ playlists: 0, followers: 0, following: 0, isLoading: false });
      return;
    }

    const fetchStats = async () => {
      try {
        // Fetch playlists count
        const { count: playlistCount } = await supabase
          .from("playlists")
          .select("*", { count: "exact", head: true })
          .eq("owner_id", userId);

        // Fetch followers count (people following this user)
        const { count: followersCount } = await supabase
          .from("user_follows")
          .select("*", { count: "exact", head: true })
          .eq("following_id", userId);

        // Fetch following count (people this user follows)
        const { count: followingCount } = await supabase
          .from("user_follows")
          .select("*", { count: "exact", head: true })
          .eq("follower_id", userId);

        setStats({
          playlists: playlistCount || 0,
          followers: followersCount || 0,
          following: followingCount || 0,
          isLoading: false,
        });
      } catch (error) {
        console.error("Failed to fetch profile stats:", error);
        setStats((prev) => ({ ...prev, isLoading: false }));
      }
    };

    fetchStats();
  }, [userId]);

  return stats;
}
