import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Loader2, UserMinus, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface User {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

interface FollowersSheetProps {
  userId: string;
  type: "followers" | "following";
  count: number;
  children: React.ReactNode;
}

export function FollowersSheet({ userId, type, count, children }: FollowersSheetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUserId(session?.user?.id || null);
    });
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      if (currentUserId) {
        fetchFollowing();
      }
    }
  }, [isOpen, userId, type, currentUserId]);

  const fetchFollowing = async () => {
    if (!currentUserId) return;
    
    const { data } = await supabase
      .from("user_follows")
      .select("following_id")
      .eq("follower_id", currentUserId);
    
    if (data) {
      setFollowingIds(new Set(data.map(f => f.following_id)));
    }
  };

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      if (type === "followers") {
        // Get users who follow this user
        const { data: follows, error } = await supabase
          .from("user_follows")
          .select("follower_id")
          .eq("following_id", userId);

        if (error) throw error;

        if (follows && follows.length > 0) {
          const followerIds = follows.map(f => f.follower_id);
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, username, display_name, avatar_url")
            .in("id", followerIds);
          
          setUsers(profiles || []);
        } else {
          setUsers([]);
        }
      } else {
        // Get users this user follows
        const { data: follows, error } = await supabase
          .from("user_follows")
          .select("following_id")
          .eq("follower_id", userId);

        if (error) throw error;

        if (follows && follows.length > 0) {
          const followingIds = follows.map(f => f.following_id);
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, username, display_name, avatar_url")
            .in("id", followingIds);
          
          setUsers(profiles || []);
        } else {
          setUsers([]);
        }
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFollow = async (targetUserId: string) => {
    if (!currentUserId) {
      toast({ title: "Please sign in", variant: "destructive" });
      return;
    }

    try {
      const { error } = await supabase.from("user_follows").insert({
        follower_id: currentUserId,
        following_id: targetUserId,
      });

      if (error) throw error;

      setFollowingIds(prev => new Set([...prev, targetUserId]));
      toast({ title: "Followed!" });
    } catch (error) {
      console.error("Failed to follow:", error);
      toast({ title: "Failed to follow", variant: "destructive" });
    }
  };

  const handleUnfollow = async (targetUserId: string) => {
    if (!currentUserId) return;

    try {
      const { error } = await supabase
        .from("user_follows")
        .delete()
        .eq("follower_id", currentUserId)
        .eq("following_id", targetUserId);

      if (error) throw error;

      setFollowingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(targetUserId);
        return newSet;
      });
      toast({ title: "Unfollowed" });
    } catch (error) {
      console.error("Failed to unfollow:", error);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        {children}
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[80vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="capitalize">{type} ({count})</SheetTitle>
        </SheetHeader>
        
        <div className="py-4 space-y-3">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : users.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {type === "followers" ? "No followers yet" : "Not following anyone yet"}
            </p>
          ) : (
            users.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-3 rounded-xl bg-card/50"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={user.avatar_url || undefined} />
                    <AvatarFallback>
                      {(user.display_name || user.username || "U")[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{user.display_name || user.username || "User"}</p>
                    {user.username && (
                      <p className="text-sm text-muted-foreground">@{user.username}</p>
                    )}
                  </div>
                </div>
                
                {currentUserId && currentUserId !== user.id && (
                  <Button
                    variant={followingIds.has(user.id) ? "outline" : "default"}
                    size="sm"
                    onClick={() => followingIds.has(user.id) ? handleUnfollow(user.id) : handleFollow(user.id)}
                  >
                    {followingIds.has(user.id) ? (
                      <>
                        <UserMinus className="w-4 h-4 mr-1" />
                        Unfollow
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4 mr-1" />
                        Follow
                      </>
                    )}
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}