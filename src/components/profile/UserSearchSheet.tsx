import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, UserPlus, UserMinus, Loader2 } from "lucide-react";
import { useUserSearch } from "@/hooks/useUserSearch";
import { useDebounce } from "@/hooks/useDebounce";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

interface UserSearchSheetProps {
  currentUserId: string | undefined;
  children: React.ReactNode;
}

export function UserSearchSheet({ currentUserId, children }: UserSearchSheetProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);
  const { results, isSearching, searchUsers, followUser, unfollowUser } = useUserSearch(currentUserId);
  const { toast } = useToast();
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    searchUsers(debouncedQuery);
  }, [debouncedQuery, searchUsers]);

  const handleFollow = async (userId: string, username: string | null) => {
    setLoadingIds((prev) => new Set(prev).add(userId));
    const success = await followUser(userId);
    setLoadingIds((prev) => {
      const next = new Set(prev);
      next.delete(userId);
      return next;
    });
    
    if (success) {
      toast({
        title: "Following!",
        description: `You are now following ${username || "this user"}`,
      });
    }
  };

  const handleUnfollow = async (userId: string, username: string | null) => {
    setLoadingIds((prev) => new Set(prev).add(userId));
    const success = await unfollowUser(userId);
    setLoadingIds((prev) => {
      const next = new Set(prev);
      next.delete(userId);
      return next;
    });
    
    if (success) {
      toast({
        title: "Unfollowed",
        description: `You unfollowed ${username || "this user"}`,
      });
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl">
        <SheetHeader>
          <SheetTitle>Find Friends</SheetTitle>
        </SheetHeader>
        
        <div className="mt-4 space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by username..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Results */}
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {isSearching && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            )}
            
            {!isSearching && results.length === 0 && query.length >= 2 && (
              <div className="text-center py-8 text-muted-foreground">
                <p>No users found</p>
                <p className="text-sm">Try a different search term</p>
              </div>
            )}

            {!isSearching && query.length < 2 && (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Search for users to follow</p>
                <p className="text-sm">Share your music taste with friends</p>
              </div>
            )}

            {results.map((user) => (
              <div
                key={user.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-card/50 hover:bg-card transition-colors"
              >
                <Avatar className="w-12 h-12">
                  <AvatarImage src={user.avatar_url || undefined} />
                  <AvatarFallback>
                    {(user.display_name || user.username || "U")[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {user.display_name || user.username || "Unknown User"}
                  </p>
                  {user.username && (
                    <p className="text-sm text-muted-foreground truncate">
                      @{user.username}
                    </p>
                  )}
                </div>

                <Button
                  size="sm"
                  variant={user.isFollowing ? "outline" : "default"}
                  onClick={() =>
                    user.isFollowing
                      ? handleUnfollow(user.id, user.username)
                      : handleFollow(user.id, user.username)
                  }
                  disabled={loadingIds.has(user.id)}
                >
                  {loadingIds.has(user.id) ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : user.isFollowing ? (
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
              </div>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
