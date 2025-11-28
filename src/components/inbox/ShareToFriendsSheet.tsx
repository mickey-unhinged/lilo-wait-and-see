import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, Search, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Track } from "@/contexts/PlayerContext";

interface User {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

interface ShareToFriendsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  track: Track | null;
}

export function ShareToFriendsSheet({ isOpen, onClose, track }: ShareToFriendsSheetProps) {
  const [friends, setFriends] = useState<User[]>([]);
  const [filteredFriends, setFilteredFriends] = useState<User[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUserId(session?.user?.id || null);
    });
  }, []);

  useEffect(() => {
    if (isOpen && currentUserId) {
      fetchFriends();
    }
  }, [isOpen, currentUserId]);

  useEffect(() => {
    if (searchQuery) {
      setFilteredFriends(
        friends.filter(f => 
          (f.display_name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (f.username?.toLowerCase().includes(searchQuery.toLowerCase()))
        )
      );
    } else {
      setFilteredFriends(friends);
    }
  }, [searchQuery, friends]);

  const fetchFriends = async () => {
    if (!currentUserId) return;
    setIsLoading(true);
    
    try {
      // Get users the current user follows
      const { data: follows, error } = await supabase
        .from("user_follows")
        .select("following_id")
        .eq("follower_id", currentUserId);

      if (error) throw error;

      if (follows && follows.length > 0) {
        const followingIds = follows.map(f => f.following_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url")
          .in("id", followingIds);
        
        setFriends(profiles || []);
        setFilteredFriends(profiles || []);
      } else {
        setFriends([]);
        setFilteredFriends([]);
      }
    } catch (error) {
      console.error("Failed to fetch friends:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFriend = (friendId: string) => {
    setSelectedFriends(prev => {
      const newSet = new Set(prev);
      if (newSet.has(friendId)) {
        newSet.delete(friendId);
      } else {
        newSet.add(friendId);
      }
      return newSet;
    });
  };

  const handleSend = async () => {
    if (!currentUserId || !track || selectedFriends.size === 0) return;
    
    setIsSending(true);
    try {
      const shares = Array.from(selectedFriends).map(friendId => ({
        sender_id: currentUserId,
        recipient_id: friendId,
        track_data: {
          id: track.id,
          title: track.title,
          artist_name: track.artist_name,
          cover_url: track.cover_url || track.album_cover,
          videoId: track.videoId,
          duration_ms: track.duration_ms,
        },
        message: message || null,
      }));

      const { error } = await supabase.from("shared_songs").insert(shares);

      if (error) throw error;

      toast({
        title: "Sent!",
        description: `Shared with ${selectedFriends.size} friend${selectedFriends.size > 1 ? "s" : ""}`,
      });
      
      setSelectedFriends(new Set());
      setMessage("");
      onClose();
    } catch (error) {
      console.error("Failed to share:", error);
      toast({
        title: "Failed to share",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  if (!track) return null;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Share Song</SheetTitle>
        </SheetHeader>
        
        {/* Track preview */}
        <div className="flex items-center gap-3 p-3 my-4 rounded-xl bg-card/50">
          <img
            src={track.cover_url || track.album_cover || "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=60&h=60&fit=crop"}
            alt={track.title}
            className="w-14 h-14 rounded-lg object-cover"
          />
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{track.title}</p>
            <p className="text-sm text-muted-foreground truncate">{track.artist_name}</p>
          </div>
        </div>

        {/* Message input */}
        <Textarea
          placeholder="Add a message (optional)"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="mb-4 resize-none"
          rows={2}
        />

        {/* Search friends */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search friends..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Friends list */}
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredFriends.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {friends.length === 0 ? "Follow some users to share songs with them!" : "No friends found"}
            </p>
          ) : (
            filteredFriends.map((friend) => (
              <button
                key={friend.id}
                onClick={() => toggleFriend(friend.id)}
                className={`w-full flex items-center justify-between p-3 rounded-xl transition-colors ${
                  selectedFriends.has(friend.id) ? "bg-primary/20 border border-primary" : "bg-card/50 hover:bg-card"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={friend.avatar_url || undefined} />
                    <AvatarFallback>
                      {(friend.display_name || friend.username || "U")[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-left">
                    <p className="font-medium">{friend.display_name || friend.username || "User"}</p>
                    {friend.username && (
                      <p className="text-sm text-muted-foreground">@{friend.username}</p>
                    )}
                  </div>
                </div>
                
                {selectedFriends.has(friend.id) && (
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}
              </button>
            ))
          )}
        </div>

        {/* Send button */}
        <Button
          className="w-full mt-4"
          onClick={handleSend}
          disabled={selectedFriends.size === 0 || isSending}
        >
          {isSending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Send className="w-4 h-4 mr-2" />
          )}
          Send to {selectedFriends.size || ""} friend{selectedFriends.size !== 1 ? "s" : ""}
        </Button>
      </SheetContent>
    </Sheet>
  );
}