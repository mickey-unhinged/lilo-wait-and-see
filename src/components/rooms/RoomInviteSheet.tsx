import { useState, useEffect } from "react";
import { Search, UserPlus, Copy, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Friend {
  id: string;
  display_name: string;
  avatar_url: string;
  invited?: boolean;
}

interface RoomInviteSheetProps {
  roomId: string;
  roomCode: string | null;
  userId: string;
}

export function RoomInviteSheet({ roomId, roomCode, userId }: RoomInviteSheetProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen || !userId) return;

    const fetchFriendsAndInvites = async () => {
      setIsLoading(true);
      try {
        // Fetch friends (users you follow who follow you back)
        const { data: following } = await supabase
          .from("user_follows")
          .select("following_id")
          .eq("follower_id", userId);

        const followingIds = following?.map((f) => f.following_id) || [];

        if (followingIds.length > 0) {
          const { data: mutualFollows } = await supabase
            .from("user_follows")
            .select("follower_id")
            .eq("following_id", userId)
            .in("follower_id", followingIds);

          const mutualIds = mutualFollows?.map((f) => f.follower_id) || [];

          if (mutualIds.length > 0) {
            const { data: profiles } = await supabase
              .from("profiles")
              .select("id, display_name, avatar_url")
              .in("id", mutualIds);

            setFriends(profiles || []);
          }
        }

        // Fetch existing invites
        const { data: invites } = await supabase
          .from("room_invites")
          .select("invited_user_id")
          .eq("room_id", roomId);

        setInvitedIds(new Set(invites?.map((i) => i.invited_user_id) || []));
      } catch (err) {
        console.error("Failed to fetch friends:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFriendsAndInvites();
  }, [isOpen, userId, roomId]);

  const handleInvite = async (friendId: string) => {
    try {
      const { error } = await supabase.from("room_invites").insert({
        room_id: roomId,
        invited_user_id: friendId,
        invited_by: userId,
      });

      if (error) throw error;

      setInvitedIds((prev) => new Set([...prev, friendId]));
      toast({ title: "Invitation sent!" });
    } catch (err) {
      console.error("Failed to invite:", err);
      toast({ title: "Failed to send invite", variant: "destructive" });
    }
  };

  const handleCopyCode = () => {
    if (roomCode) {
      navigator.clipboard.writeText(roomCode);
      setCopied(true);
      toast({ title: "Room code copied!" });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <UserPlus className="w-4 h-4" />
          Invite
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[70vh] rounded-t-3xl">
        <SheetHeader className="pb-4">
          <SheetTitle>Invite to Room</SheetTitle>
        </SheetHeader>

        <Tabs defaultValue="friends" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="friends">Friends</TabsTrigger>
            <TabsTrigger value="code">Room Code</TabsTrigger>
          </TabsList>

          <TabsContent value="friends" className="space-y-4">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse flex items-center gap-3">
                    <div className="w-10 h-10 bg-muted rounded-full" />
                    <div className="flex-1">
                      <div className="h-4 bg-muted rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : friends.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No friends to invite. Follow users and have them follow you back to become friends!
              </p>
            ) : (
              <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                {friends.map((friend) => (
                  <div
                    key={friend.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-card transition-colors"
                  >
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={friend.avatar_url} />
                      <AvatarFallback>{friend.display_name?.[0] || "U"}</AvatarFallback>
                    </Avatar>
                    <span className="flex-1 font-medium">{friend.display_name || "User"}</span>
                    <Button
                      size="sm"
                      variant={invitedIds.has(friend.id) ? "secondary" : "default"}
                      disabled={invitedIds.has(friend.id)}
                      onClick={() => handleInvite(friend.id)}
                    >
                      {invitedIds.has(friend.id) ? (
                        <>
                          <Check className="w-4 h-4 mr-1" />
                          Invited
                        </>
                      ) : (
                        "Invite"
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="code" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Share this code with friends so they can join your room
            </p>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-card p-4 rounded-xl text-center">
                <span className="text-3xl font-bold tracking-widest font-mono">
                  {roomCode || "------"}
                </span>
              </div>
              <Button size="icon" variant="outline" onClick={handleCopyCode}>
                {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Friends can search for this code in the Listening Rooms section
            </p>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
