import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  ArrowLeft, Users, Send, Music, Play, Pause, SkipForward, 
  Crown, LogOut, Heart, Smile, ThumbsUp, Flame, Star, Lock, Radio, RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { usePlayer, type Track } from "@/contexts/PlayerContext";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Watermark } from "@/components/common/Watermark";
import { RoomMusicSearch } from "@/components/rooms/RoomMusicSearch";
import { RoomInviteSheet } from "@/components/rooms/RoomInviteSheet";

interface Room {
  id: string;
  name: string;
  description: string;
  host_id: string;
  current_track: Track | null;
  is_playing: boolean;
  playback_position: number;
  is_private: boolean;
  room_code: string | null;
}

interface Participant {
  user_id: string;
  profile?: { display_name: string; avatar_url: string };
}

interface Message {
  id: string;
  user_id: string;
  content: string;
  reaction?: string;
  created_at: string;
  profile?: { display_name: string; avatar_url: string };
}

const REACTIONS = [
  { emoji: "❤️", icon: Heart },
  { emoji: "🔥", icon: Flame },
  { emoji: "👍", icon: ThumbsUp },
  { emoji: "⭐", icon: Star },
  { emoji: "😊", icon: Smile },
];

export default function ListeningRoom() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentTrack, isPlaying, play, pause, playTrack, audioElement, progress } = usePlayer();
  
  const [room, setRoom] = useState<Room | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [userProfile, setUserProfile] = useState<{ display_name: string; avatar_url: string } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isBehind, setIsBehind] = useState(false);
  const [needsUserGesture, setNeedsUserGesture] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const hasAutoPlayedRef = useRef(false);
  const lastKnownHostPositionRef = useRef<{ position: number; updatedAt: number } | null>(null);

  // Check auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
        return;
      }
      setUserId(session.user.id);
      
      // Fetch user profile
      supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", session.user.id)
        .single()
        .then(({ data }) => {
          if (data) setUserProfile(data);
        });
    });
  }, [navigate]);

  // Fetch room data and auto-play for participants (radio-like behavior)
  useEffect(() => {
    if (!id || !userId) return;

    const fetchRoom = async () => {
      const { data: roomData, error } = await supabase
        .from("listening_rooms")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !roomData) {
        toast({ title: "Room not found", variant: "destructive" });
        navigate("/");
        return;
      }

      const roomWithTrack = {
        ...roomData,
        current_track: roomData.current_track as unknown as Track | null,
      };
      
      setRoom(roomWithTrack);
      const userIsHost = roomData.host_id === userId;
      setIsHost(userIsHost);

      // Join room
      await supabase.from("room_participants").upsert({
        room_id: id,
        user_id: userId,
      });

      // Store host position for catch-up feature
      lastKnownHostPositionRef.current = {
        position: roomWithTrack.playback_position || 0,
        updatedAt: new Date(roomData.updated_at).getTime(),
      };
      
      // Auto-play for participants (radio-like behavior)
      if (!userIsHost && roomWithTrack.current_track && !hasAutoPlayedRef.current) {
        hasAutoPlayedRef.current = true;
        setIsSyncing(true);
        
        // Calculate the actual current position based on time elapsed since last update
        const lastUpdated = new Date(roomData.updated_at).getTime();
        const now = Date.now();
        const elapsedSeconds = (now - lastUpdated) / 1000;
        const calculatedPosition = (roomWithTrack.playback_position || 0) + (roomWithTrack.is_playing ? elapsedSeconds : 0);
        
        try {
          // Play the track
          await playTrack(roomWithTrack.current_track);
          
          // Wait for audio to load, then seek to calculated position and start playing
          const seekAndPlay = async () => {
            if (audioElement) {
              // Ensure we don't seek past the duration
              const seekPosition = Math.min(calculatedPosition, audioElement.duration || calculatedPosition);
              if (seekPosition > 0) {
                audioElement.currentTime = seekPosition;
              }
              
              // Try to play - might fail due to autoplay restrictions
              if (roomWithTrack.is_playing) {
                try {
                  await audioElement.play();
                  setNeedsUserGesture(false);
                  toast({ title: "📻 Tuned in!", description: `Now listening to ${roomWithTrack.name}` });
                } catch (playError) {
                  console.log("Autoplay blocked, needs user gesture:", playError);
                  setNeedsUserGesture(true);
                  toast({ 
                    title: "Tap to start listening", 
                    description: "Browser requires interaction to play audio"
                  });
                }
              } else {
                pause();
              }
              setIsSyncing(false);
            }
          };
          
          // Use loadedmetadata event for more reliable seeking
          if (audioElement) {
            if (audioElement.readyState >= 1) {
              await seekAndPlay();
            } else {
              const handleLoaded = async () => {
                await seekAndPlay();
                audioElement.removeEventListener('loadedmetadata', handleLoaded);
              };
              audioElement.addEventListener('loadedmetadata', handleLoaded);
              // Fallback timeout in case event doesn't fire
              setTimeout(async () => {
                await seekAndPlay();
                audioElement.removeEventListener('loadedmetadata', handleLoaded);
              }, 2000);
            }
          }
        } catch (err) {
          console.error("Failed to auto-play:", err);
          setNeedsUserGesture(true);
          setIsSyncing(false);
        }
      }

      // Fetch participants
      const { data: participantsData } = await supabase
        .from("room_participants")
        .select("user_id")
        .eq("room_id", id);

      if (participantsData) {
        const userIds = participantsData.map(p => p.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, display_name, avatar_url")
          .in("id", userIds);

        const participantsWithProfiles = participantsData.map(p => ({
          ...p,
          profile: profiles?.find(pr => pr.id === p.user_id),
        }));
        setParticipants(participantsWithProfiles);
      }

      // Fetch messages
      const { data: messagesData } = await supabase
        .from("room_messages")
        .select("*")
        .eq("room_id", id)
        .order("created_at", { ascending: true })
        .limit(100);

      if (messagesData) {
        const userIds = [...new Set(messagesData.map(m => m.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, display_name, avatar_url")
          .in("id", userIds);

        const messagesWithProfiles = messagesData.map(m => ({
          ...m,
          profile: profiles?.find(pr => pr.id === m.user_id),
        }));
        setMessages(messagesWithProfiles);
      }
    };

    fetchRoom();
  }, [id, userId, navigate, toast, playTrack, pause, audioElement]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!id) return;

    const roomChannel = supabase
      .channel(`room-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "listening_rooms", filter: `id=eq.${id}` },
        (payload) => {
          if (payload.eventType === "UPDATE") {
            const newRoom = payload.new as any;
            setRoom({
              ...newRoom,
              current_track: newRoom.current_track as unknown as Track | null,
            });
            
            // Track host position for catch-up feature
            if (!isHost) {
              lastKnownHostPositionRef.current = {
                position: newRoom.playback_position || 0,
                updatedAt: new Date(newRoom.updated_at).getTime(),
              };
            }
            
            // Sync playback for non-hosts
            if (!isHost && newRoom.current_track) {
              const currentTrackId = currentTrack?.id;
              const newTrackId = (newRoom.current_track as Track)?.id;
              
              // Only change track if it's different
              if (newTrackId !== currentTrackId) {
                if (newRoom.is_playing) {
                  playTrack(newRoom.current_track as Track);
                  // Sync position after track loads
                  setTimeout(() => {
                    if (audioElement && newRoom.playback_position) {
                      const lastUpdated = new Date(newRoom.updated_at).getTime();
                      const elapsed = (Date.now() - lastUpdated) / 1000;
                      audioElement.currentTime = newRoom.playback_position + elapsed;
                    }
                  }, 1000);
                }
              } else {
                // Same track, just sync play/pause state
                if (newRoom.is_playing && audioElement?.paused) {
                  audioElement.play().catch(() => setNeedsUserGesture(true));
                } else if (!newRoom.is_playing && !audioElement?.paused) {
                  pause();
                }
              }
            }
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "room_messages", filter: `room_id=eq.${id}` },
        async (payload) => {
          const newMsg = payload.new as Message;
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name, avatar_url")
            .eq("id", newMsg.user_id)
            .single();
          
          setMessages(prev => [...prev, { ...newMsg, profile }]);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "room_participants", filter: `room_id=eq.${id}` },
        async () => {
          // Refetch participants
          const { data: participantsData } = await supabase
            .from("room_participants")
            .select("user_id")
            .eq("room_id", id);

          if (participantsData) {
            const userIds = participantsData.map(p => p.user_id);
            const { data: profiles } = await supabase
              .from("profiles")
              .select("id, display_name, avatar_url")
              .in("id", userIds);

            const participantsWithProfiles = participantsData.map(p => ({
              ...p,
              profile: profiles?.find(pr => pr.id === p.user_id),
            }));
            setParticipants(participantsWithProfiles);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(roomChannel);
    };
  }, [id, isHost, playTrack, pause]);

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Sync host's playback to room (including position for radio sync)
  useEffect(() => {
    if (!isHost || !id || !room) return;

    const syncPlayback = async () => {
      await supabase
        .from("listening_rooms")
        .update({
          current_track: currentTrack as any,
          is_playing: isPlaying,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
    };

    syncPlayback();
  }, [currentTrack, isPlaying, isHost, id, room]);

  // Host: Periodically sync playback position for radio-like sync
  useEffect(() => {
    if (!isHost || !id || !audioElement) return;

    const syncPosition = async () => {
      if (!audioElement.paused && !audioElement.ended) {
        const currentPosition = audioElement.currentTime;
        await supabase
          .from("listening_rooms")
          .update({
            playback_position: currentPosition,
            updated_at: new Date().toISOString(),
          })
          .eq("id", id);
      }
    };

    // Sync position every 3 seconds for better accuracy
    const interval = setInterval(syncPosition, 3000);
    // Also sync immediately when position changes significantly (seeking)
    const handleSeeked = () => syncPosition();
    audioElement.addEventListener('seeked', handleSeeked);
    
    return () => {
      clearInterval(interval);
      audioElement.removeEventListener('seeked', handleSeeked);
    };
  }, [isHost, id, audioElement]);

  // Check if participant is behind the host
  useEffect(() => {
    if (isHost || !audioElement || !lastKnownHostPositionRef.current) return;
    
    const checkIfBehind = () => {
      if (!lastKnownHostPositionRef.current) return;
      
      const hostRef = lastKnownHostPositionRef.current;
      const elapsed = (Date.now() - hostRef.updatedAt) / 1000;
      const estimatedHostPosition = hostRef.position + elapsed;
      const myPosition = audioElement.currentTime;
      
      // Consider "behind" if more than 5 seconds off
      setIsBehind(Math.abs(estimatedHostPosition - myPosition) > 5);
    };
    
    const interval = setInterval(checkIfBehind, 2000);
    return () => clearInterval(interval);
  }, [isHost, audioElement]);

  // Catch up to host's current position
  const handleCatchUp = useCallback(async () => {
    if (!audioElement || !lastKnownHostPositionRef.current || !room?.current_track) return;
    
    setIsSyncing(true);
    const hostRef = lastKnownHostPositionRef.current;
    const elapsed = (Date.now() - hostRef.updatedAt) / 1000;
    const estimatedHostPosition = hostRef.position + (room.is_playing ? elapsed : 0);
    
    audioElement.currentTime = estimatedHostPosition;
    
    if (room.is_playing && audioElement.paused) {
      try {
        await audioElement.play();
        setNeedsUserGesture(false);
      } catch {
        setNeedsUserGesture(true);
      }
    }
    
    setIsSyncing(false);
    setIsBehind(false);
    toast({ title: "Synced!", description: "You're now in sync with the host" });
  }, [audioElement, room, toast]);

  // Start playing for first time (when user gesture is required)
  const handleStartListening = useCallback(async () => {
    if (!audioElement || !room?.current_track) return;
    
    setIsSyncing(true);
    
    // First ensure we have the track loaded
    if (!currentTrack || currentTrack.id !== room.current_track.id) {
      await playTrack(room.current_track);
    }
    
    // Calculate current host position
    if (lastKnownHostPositionRef.current) {
      const hostRef = lastKnownHostPositionRef.current;
      const elapsed = (Date.now() - hostRef.updatedAt) / 1000;
      const estimatedHostPosition = hostRef.position + (room.is_playing ? elapsed : 0);
      audioElement.currentTime = estimatedHostPosition;
    }
    
    try {
      await audioElement.play();
      setNeedsUserGesture(false);
      toast({ title: "📻 Tuned in!", description: `Now listening to ${room.name}` });
    } catch (err) {
      console.error("Failed to play:", err);
    }
    
    setIsSyncing(false);
  }, [audioElement, room, currentTrack, playTrack, toast]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !userId || !id) return;

    await supabase.from("room_messages").insert({
      room_id: id,
      user_id: userId,
      content: newMessage.trim(),
    });

    setNewMessage("");
  };

  const handleSendReaction = async (emoji: string) => {
    if (!userId || !id) return;

    await supabase.from("room_messages").insert({
      room_id: id,
      user_id: userId,
      content: emoji,
      reaction: emoji,
    });
  };

  const handleLeaveRoom = async () => {
    if (!userId || !id) return;

    await supabase
      .from("room_participants")
      .delete()
      .eq("room_id", id)
      .eq("user_id", userId);

    navigate("/");
  };

  if (!room) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading room...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-bold">{room.name}</h1>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Users className="w-3 h-3" />
                <span>{participants.length} listening</span>
              </div>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLeaveRoom}>
            <LogOut className="w-4 h-4 mr-2" />
            Leave
          </Button>
        </div>
      </header>

      {/* Now Playing */}
      <div className="px-4 py-6 bg-gradient-to-b from-primary/10 to-transparent">
        {/* Radio indicator for participants */}
        {!isHost && room.current_track && (
          <div className="flex items-center gap-2 mb-3 text-xs">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-primary/20 text-primary">
              <Radio className="w-3 h-3 animate-pulse" />
              <span>Live Radio</span>
            </div>
            {isSyncing && (
              <span className="text-muted-foreground animate-pulse">Syncing...</span>
            )}
          </div>
        )}
        
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-xl overflow-hidden bg-card relative">
            {room.current_track ? (
              <>
                <img
                  src={room.current_track.cover_url || room.current_track.album_cover}
                  alt={room.current_track.title}
                  className="w-full h-full object-cover"
                />
                {room.is_playing && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <div className="flex gap-0.5">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="w-1 bg-primary rounded-full animate-pulse"
                          style={{
                            height: `${12 + Math.random() * 8}px`,
                            animationDelay: `${i * 0.15}s`,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Music className="w-8 h-8 text-muted-foreground" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">
              {room.current_track?.title || "No track playing"}
            </p>
            <p className="text-sm text-muted-foreground truncate">
              {room.current_track?.artist_name || "Waiting for host..."}
            </p>
            {isHost ? (
              <div className="flex flex-col gap-2 mt-2">
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => (room.is_playing ? pause() : play())}
                  >
                    {room.is_playing ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                  </Button>
                  <RoomMusicSearch onSelectTrack={(track) => playTrack(track)} />
                  {room.is_private && (
                    <RoomInviteSheet 
                      roomId={room.id} 
                      roomCode={room.room_code} 
                      userId={userId!} 
                    />
                  )}
                </div>
                <span className="text-xs text-primary flex items-center gap-1">
                  <Crown className="w-3 h-3" /> You're the DJ
                  {room.is_private && (
                    <span className="ml-2 flex items-center gap-1 text-muted-foreground">
                      <Lock className="w-3 h-3" /> Private Room
                    </span>
                  )}
                </span>
              </div>
            ) : (
              <div className="mt-2 space-y-2">
                {/* Tap to start listening button (when autoplay blocked) */}
                {needsUserGesture && room.current_track && (
                  <Button 
                    size="sm" 
                    onClick={handleStartListening}
                    className="w-full"
                    disabled={isSyncing}
                  >
                    <Play className="w-4 h-4 mr-2" />
                    {isSyncing ? "Syncing..." : "Tap to Start Listening"}
                  </Button>
                )}
                
                {/* Catch up button (when behind the host) */}
                {!needsUserGesture && isBehind && (
                  <Button 
                    size="sm" 
                    variant="secondary"
                    onClick={handleCatchUp}
                    disabled={isSyncing}
                    className="gap-2"
                  >
                    <RefreshCw className={cn("w-4 h-4", isSyncing && "animate-spin")} />
                    Catch Up
                  </Button>
                )}
                
                <p className="text-xs text-muted-foreground">
                  🎧 Listening along with {participants.length} others
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Participants */}
      <div className="px-4 py-3 border-b border-border/50">
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {participants.map((p) => (
            <div key={p.user_id} className="flex flex-col items-center gap-1 flex-shrink-0">
              <Avatar className="w-10 h-10">
                <AvatarImage src={p.profile?.avatar_url} />
                <AvatarFallback>
                  {p.profile?.display_name?.[0] || "U"}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground truncate max-w-[60px]">
                {p.profile?.display_name || "User"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Chat */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
      >
        {messages.map((msg) => {
          const isOwn = msg.user_id === userId;
          
          if (msg.reaction) {
            return (
              <div
                key={msg.id}
                className={cn(
                  "flex items-center gap-2",
                  isOwn ? "justify-end" : "justify-start"
                )}
              >
                {!isOwn && (
                  <Avatar className="w-6 h-6">
                    <AvatarImage src={msg.profile?.avatar_url} />
                    <AvatarFallback className="text-xs">
                      {msg.profile?.display_name?.[0] || "U"}
                    </AvatarFallback>
                  </Avatar>
                )}
                <span className="text-2xl animate-bounce">{msg.reaction}</span>
              </div>
            );
          }

          return (
            <div
              key={msg.id}
              className={cn(
                "flex gap-2 max-w-[80%]",
                isOwn ? "ml-auto flex-row-reverse" : ""
              )}
            >
              {!isOwn && (
                <Avatar className="w-8 h-8 flex-shrink-0">
                  <AvatarImage src={msg.profile?.avatar_url} />
                  <AvatarFallback className="text-xs">
                    {msg.profile?.display_name?.[0] || "U"}
                  </AvatarFallback>
                </Avatar>
              )}
              <div>
                {!isOwn && (
                  <span className="text-xs text-muted-foreground mb-1 block">
                    {msg.profile?.display_name || "User"}
                  </span>
                )}
                <div
                  className={cn(
                    "px-3 py-2 rounded-2xl text-sm",
                    isOwn
                      ? "bg-primary text-primary-foreground rounded-tr-sm"
                      : "bg-card rounded-tl-sm"
                  )}
                >
                  {msg.content}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Reactions */}
      <div className="px-4 py-2 flex justify-center gap-3">
        {REACTIONS.map(({ emoji }) => (
          <button
            key={emoji}
            onClick={() => handleSendReaction(emoji)}
            className="text-2xl hover:scale-125 transition-transform"
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Message Input */}
      <div className="sticky bottom-0 px-4 py-3 bg-background/80 backdrop-blur-lg border-t border-border/50">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
            placeholder="Say something..."
            className="flex-1"
          />
          <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <Watermark variant="subtle" className="mt-3" />
      </div>
    </div>
  );
}
