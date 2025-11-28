import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Inbox, Loader2, Play, Heart, ListPlus, Trash2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePlayer, Track } from "@/contexts/PlayerContext";
import { useLikedSongs } from "@/hooks/useLikedSongs";
import { formatDistanceToNow } from "date-fns";

interface SharedSong {
  id: string;
  sender_id: string;
  track_data: {
    id: string;
    title: string;
    artist_name: string;
    cover_url?: string;
    videoId?: string;
    duration_ms: number;
  };
  message: string | null;
  read_at: string | null;
  created_at: string;
  sender?: {
    id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
}

interface InboxSheetProps {
  children?: React.ReactNode;
}

export function InboxSheet({ children }: InboxSheetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [shares, setShares] = useState<SharedSong[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const { toast } = useToast();
  const { playTrack } = usePlayer();
  const { toggleLike, isLiked } = useLikedSongs();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUserId(session?.user?.id || null);
    });
  }, []);

  useEffect(() => {
    if (currentUserId) {
      fetchUnreadCount();
    }
  }, [currentUserId]);

  useEffect(() => {
    if (isOpen && currentUserId) {
      fetchShares();
    }
  }, [isOpen, currentUserId]);

  const fetchUnreadCount = async () => {
    if (!currentUserId) return;
    
    const { count } = await supabase
      .from("shared_songs")
      .select("*", { count: "exact", head: true })
      .eq("recipient_id", currentUserId)
      .is("read_at", null);
    
    setUnreadCount(count || 0);
  };

  const fetchShares = async () => {
    if (!currentUserId) return;
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase
        .from("shared_songs")
        .select("*")
        .eq("recipient_id", currentUserId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        // Fetch sender profiles
        const senderIds = [...new Set(data.map(s => s.sender_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url")
          .in("id", senderIds);

        const sharesWithSenders = data.map(share => ({
          ...share,
          track_data: share.track_data as SharedSong["track_data"],
          sender: profiles?.find(p => p.id === share.sender_id),
        }));

        setShares(sharesWithSenders);
        
        // Mark unread as read
        const unreadIds = data.filter(s => !s.read_at).map(s => s.id);
        if (unreadIds.length > 0) {
          await supabase
            .from("shared_songs")
            .update({ read_at: new Date().toISOString() })
            .in("id", unreadIds);
          setUnreadCount(0);
        }
      } else {
        setShares([]);
      }
    } catch (error) {
      console.error("Failed to fetch shares:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlay = (share: SharedSong) => {
    const track: Track = {
      id: share.track_data.id,
      title: share.track_data.title,
      artist_id: share.track_data.id,
      artist_name: share.track_data.artist_name,
      cover_url: share.track_data.cover_url,
      videoId: share.track_data.videoId,
      duration_ms: share.track_data.duration_ms,
    };
    playTrack(track);
  };

  const handleLike = async (share: SharedSong) => {
    const track: Track = {
      id: share.track_data.id,
      title: share.track_data.title,
      artist_id: share.track_data.id,
      artist_name: share.track_data.artist_name,
      cover_url: share.track_data.cover_url,
      videoId: share.track_data.videoId,
      duration_ms: share.track_data.duration_ms,
    };
    
    const result = await toggleLike(track);
    toast({
      title: result ? "Added to Liked Songs" : "Removed from Liked Songs",
    });
  };

  const handleDelete = async (shareId: string) => {
    try {
      const { error } = await supabase
        .from("shared_songs")
        .delete()
        .eq("id", shareId);

      if (error) throw error;

      setShares(prev => prev.filter(s => s.id !== shareId));
      toast({ title: "Removed" });
    } catch (error) {
      console.error("Failed to delete share:", error);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        {children || (
          <button className="relative p-2 rounded-full hover:bg-card transition-colors">
            <Inbox className="w-6 h-6" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
        )}
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Inbox className="w-5 h-5" />
            Inbox
          </SheetTitle>
        </SheetHeader>
        
        <div className="py-4 space-y-3 max-h-[calc(100vh-120px)] overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : shares.length === 0 ? (
            <div className="text-center py-12">
              <Inbox className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No shared songs yet</p>
              <p className="text-sm text-muted-foreground/70">Songs your friends share will appear here</p>
            </div>
          ) : (
            shares.map((share) => (
              <div
                key={share.id}
                className={`p-4 rounded-xl ${!share.read_at ? "bg-primary/10" : "bg-card/50"}`}
              >
                {/* Sender info */}
                <div className="flex items-center gap-2 mb-3">
                  <Avatar className="w-6 h-6">
                    <AvatarImage src={share.sender?.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {(share.sender?.display_name || share.sender?.username || "U")[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">
                    {share.sender?.display_name || share.sender?.username || "Someone"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(share.created_at), { addSuffix: true })}
                  </span>
                </div>

                {/* Track info */}
                <div className="flex items-center gap-3 mb-3">
                  <img
                    src={share.track_data.cover_url || "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=60&h=60&fit=crop"}
                    alt={share.track_data.title}
                    className="w-14 h-14 rounded-lg object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{share.track_data.title}</p>
                    <p className="text-sm text-muted-foreground truncate">{share.track_data.artist_name}</p>
                  </div>
                </div>

                {/* Message */}
                {share.message && (
                  <p className="text-sm text-muted-foreground mb-3 italic">"{share.message}"</p>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={() => handlePlay(share)}>
                    <Play className="w-4 h-4 mr-1" />
                    Play
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleLike(share)}
                  >
                    <Heart className={`w-4 h-4 ${isLiked(share.track_data.id) ? "fill-primary text-primary" : ""}`} />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(share.id)}
                    className="ml-auto text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}