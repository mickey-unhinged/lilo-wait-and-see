import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Radio, Plus, Users, Music, Play, Crown, ArrowRight 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { Track } from "@/contexts/PlayerContext";

interface Room {
  id: string;
  name: string;
  description: string;
  host_id: string;
  current_track: Track | null;
  is_playing: boolean;
  participant_count?: number;
}

interface ListeningRoomsSheetProps {
  trigger?: React.ReactNode;
}

export function ListeningRoomsSheet({ trigger }: ListeningRoomsSheetProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomDescription, setNewRoomDescription] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id || null);
    });
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const fetchRooms = async () => {
      setIsLoading(true);
      try {
        const { data: roomsData, error } = await supabase
          .from("listening_rooms")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(20);

        if (error) throw error;

        // Get participant counts
        const roomsWithCounts = await Promise.all(
          (roomsData || []).map(async (room) => {
            const { count } = await supabase
              .from("room_participants")
              .select("*", { count: "exact", head: true })
              .eq("room_id", room.id);

            return {
              ...room,
              current_track: room.current_track as unknown as Track | null,
              participant_count: count || 0,
            };
          })
        );

        setRooms(roomsWithCounts);
      } catch (err) {
        console.error("Failed to fetch rooms:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRooms();

    // Subscribe to room changes
    const channel = supabase
      .channel("rooms-list")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "listening_rooms" },
        () => fetchRooms()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen]);

  const handleCreateRoom = async () => {
    if (!userId) {
      toast({ title: "Please sign in to create a room", variant: "destructive" });
      return;
    }

    if (!newRoomName.trim()) {
      toast({ title: "Please enter a room name", variant: "destructive" });
      return;
    }

    try {
      const { data, error } = await supabase
        .from("listening_rooms")
        .insert({
          name: newRoomName.trim(),
          description: newRoomDescription.trim() || null,
          host_id: userId,
        })
        .select()
        .single();

      if (error) throw error;

      toast({ title: "Room created!" });
      setCreateOpen(false);
      setIsOpen(false);
      setNewRoomName("");
      setNewRoomDescription("");
      navigate(`/room/${data.id}`);
    } catch (err) {
      console.error("Failed to create room:", err);
      toast({ title: "Failed to create room", variant: "destructive" });
    }
  };

  const handleJoinRoom = (roomId: string) => {
    if (!userId) {
      toast({ title: "Please sign in to join a room", variant: "destructive" });
      return;
    }
    setIsOpen(false);
    navigate(`/room/${roomId}`);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon">
            <Radio className="w-5 h-5" />
          </Button>
        )}
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader className="pb-4 border-b border-border/50">
          <SheetTitle className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-primary" />
            Listening Rooms
          </SheetTitle>
        </SheetHeader>

        <div className="py-4 space-y-4 overflow-y-auto max-h-[calc(85vh-120px)]">
          {/* Create Room Button */}
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="w-full gap-2" size="lg">
                <Plus className="w-5 h-5" />
                Create a Room
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Listening Room</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="room-name">Room Name</Label>
                  <Input
                    id="room-name"
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    placeholder="e.g., Friday Night Vibes"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="room-desc">Description (optional)</Label>
                  <Input
                    id="room-desc"
                    value={newRoomDescription}
                    onChange={(e) => setNewRoomDescription(e.target.value)}
                    placeholder="What kind of music will you play?"
                  />
                </div>
                <Button onClick={handleCreateRoom} className="w-full">
                  Create Room
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Active Rooms */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              Active Rooms
            </h3>
            
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-20 bg-card rounded-xl" />
                  </div>
                ))}
              </div>
            ) : rooms.length === 0 ? (
              <div className="text-center py-8">
                <Radio className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No active rooms</p>
                <p className="text-sm text-muted-foreground">Be the first to create one!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {rooms.map((room) => (
                  <button
                    key={room.id}
                    onClick={() => handleJoinRoom(room.id)}
                    className="w-full flex items-center gap-3 p-3 bg-card rounded-xl hover:bg-card/80 transition-colors text-left"
                  >
                    <div className={cn(
                      "w-14 h-14 rounded-lg overflow-hidden bg-gradient-to-br flex items-center justify-center",
                      room.is_playing ? "from-primary to-primary/50" : "from-muted to-muted/50"
                    )}>
                      {room.current_track ? (
                        <img
                          src={room.current_track.cover_url || room.current_track.album_cover}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Music className="w-6 h-6 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{room.name}</p>
                        {room.is_playing && (
                          <span className="flex items-center gap-1 text-xs text-primary">
                            <Play className="w-3 h-3" fill="currentColor" />
                            Live
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {room.current_track?.title || "No track playing"}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <Users className="w-3 h-3" />
                        <span>{room.participant_count} listening</span>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
