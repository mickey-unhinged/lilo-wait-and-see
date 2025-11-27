import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UserResult {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  isFollowing: boolean;
}

export function useUserSearch(currentUserId: string | undefined) {
  const [results, setResults] = useState<UserResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const searchUsers = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    try {
      // Search profiles by username or display_name
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
        .neq("id", currentUserId || "")
        .limit(10);

      if (error) throw error;

      // Check follow status for each user
      let resultsWithFollowStatus: UserResult[] = [];
      
      if (profiles && currentUserId) {
        const { data: follows } = await supabase
          .from("user_follows")
          .select("following_id")
          .eq("follower_id", currentUserId);

        const followingIds = new Set(follows?.map((f) => f.following_id) || []);

        resultsWithFollowStatus = profiles.map((p) => ({
          ...p,
          isFollowing: followingIds.has(p.id),
        }));
      } else {
        resultsWithFollowStatus = (profiles || []).map((p) => ({
          ...p,
          isFollowing: false,
        }));
      }

      setResults(resultsWithFollowStatus);
    } catch (error) {
      console.error("User search failed:", error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [currentUserId]);

  const followUser = useCallback(async (targetUserId: string) => {
    if (!currentUserId) return false;

    try {
      const { error } = await supabase
        .from("user_follows")
        .insert({ follower_id: currentUserId, following_id: targetUserId });

      if (error) throw error;

      setResults((prev) =>
        prev.map((u) => (u.id === targetUserId ? { ...u, isFollowing: true } : u))
      );
      return true;
    } catch (error) {
      console.error("Follow failed:", error);
      return false;
    }
  }, [currentUserId]);

  const unfollowUser = useCallback(async (targetUserId: string) => {
    if (!currentUserId) return false;

    try {
      const { error } = await supabase
        .from("user_follows")
        .delete()
        .eq("follower_id", currentUserId)
        .eq("following_id", targetUserId);

      if (error) throw error;

      setResults((prev) =>
        prev.map((u) => (u.id === targetUserId ? { ...u, isFollowing: false } : u))
      );
      return true;
    } catch (error) {
      console.error("Unfollow failed:", error);
      return false;
    }
  }, [currentUserId]);

  return { results, isSearching, searchUsers, followUser, unfollowUser };
}
