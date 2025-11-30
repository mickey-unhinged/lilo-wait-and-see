import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ListMusic, GripVertical, X, Play, Save } from "lucide-react";
import { usePlayer, Track } from "@/contexts/PlayerContext";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface QueueManagerProps {
  trigger?: React.ReactNode;
}

const SAVED_QUEUES_KEY = "lilo-saved-queues";

interface SavedQueue {
  id: string;
  name: string;
  tracks: Track[];
  createdAt: string;
}

function loadSavedQueues(): SavedQueue[] {
  try {
    const stored = localStorage.getItem(SAVED_QUEUES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveSavedQueues(queues: SavedQueue[]) {
  localStorage.setItem(SAVED_QUEUES_KEY, JSON.stringify(queues));
}

export function QueueManager({ trigger }: QueueManagerProps) {
  const { queue, currentTrack, playTrack, setQueue, isPlaying } = usePlayer();
  const [isOpen, setIsOpen] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [savedQueues, setSavedQueues] = useState<SavedQueue[]>(loadSavedQueues);
  const [showSaved, setShowSaved] = useState(false);
  const { toast } = useToast();

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newQueue = [...queue];
    const [draggedItem] = newQueue.splice(draggedIndex, 1);
    newQueue.splice(index, 0, draggedItem);
    setQueue(newQueue);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const removeFromQueue = (index: number) => {
    const newQueue = queue.filter((_, i) => i !== index);
    setQueue(newQueue);
    toast({ title: "Removed from queue" });
  };

  const saveCurrentQueue = () => {
    if (queue.length === 0) {
      toast({ title: "Queue is empty", variant: "destructive" });
      return;
    }

    const name = `Queue ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    const newQueue: SavedQueue = {
      id: Date.now().toString(),
      name,
      tracks: queue,
      createdAt: new Date().toISOString(),
    };

    const updated = [newQueue, ...savedQueues].slice(0, 10); // Keep max 10 saved queues
    setSavedQueues(updated);
    saveSavedQueues(updated);
    toast({ title: "Queue saved!", description: name });
  };

  const loadSavedQueue = (saved: SavedQueue) => {
    setQueue(saved.tracks);
    if (saved.tracks.length > 0) {
      playTrack(saved.tracks[0], saved.tracks);
    }
    toast({ title: "Queue loaded", description: saved.name });
  };

  const deleteSavedQueue = (id: string) => {
    const updated = savedQueues.filter(q => q.id !== id);
    setSavedQueues(updated);
    saveSavedQueues(updated);
    toast({ title: "Saved queue deleted" });
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        {trigger || (
          <button className="p-2 text-muted-foreground hover:text-foreground transition-colors">
            <ListMusic className="w-5 h-5" />
          </button>
        )}
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center justify-between">
            <span>Queue Manager</span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={showSaved ? "secondary" : "outline"}
                onClick={() => setShowSaved(!showSaved)}
              >
                Saved
              </Button>
              <Button size="sm" variant="outline" onClick={saveCurrentQueue}>
                <Save className="w-4 h-4 mr-1" />
                Save Queue
              </Button>
            </div>
          </SheetTitle>
        </SheetHeader>

        {showSaved ? (
          <div className="h-[calc(100%-5rem)] overflow-y-auto space-y-2 px-2">
            {savedQueues.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No saved queues</p>
                <p className="text-sm">Save your current queue to access it later</p>
              </div>
            ) : (
              savedQueues.map((saved) => (
                <div
                  key={saved.id}
                  className="flex items-center gap-3 p-4 rounded-xl bg-card/30 hover:bg-card/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{saved.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {saved.tracks.length} tracks
                    </p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => loadSavedQueue(saved)}>
                    <Play className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteSavedQueue(saved.id)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="h-[calc(100%-5rem)] overflow-y-auto space-y-1 px-2">
            <p className="text-xs text-muted-foreground px-2 pb-2">
              Drag to reorder • {queue.length} tracks
            </p>
            {queue.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ListMusic className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Queue is empty</p>
                <p className="text-sm">Add songs to start playing</p>
              </div>
            ) : (
              queue.map((track, index) => {
                const isCurrent = currentTrack?.id === track.id;
                return (
                  <div
                    key={`${track.id}-${index}`}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    className={cn(
                      "flex items-center gap-2 p-3 rounded-xl transition-all cursor-grab active:cursor-grabbing",
                      isCurrent ? "bg-primary/10 border border-primary/20" : "hover:bg-card/50",
                      draggedIndex === index && "opacity-50 scale-[0.98]"
                    )}
                  >
                    <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="w-6 text-xs text-muted-foreground">{index + 1}</span>
                    <img
                      src={track.cover_url || track.album_cover || "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=60&h=60&fit=crop"}
                      alt={track.title}
                      className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                    />
                    <button
                      onClick={() => {
                        playTrack(track, queue);
                      }}
                      className="flex-1 min-w-0 text-left"
                    >
                      <p className={cn(
                        "font-medium truncate text-sm",
                        isCurrent && "text-primary"
                      )}>
                        {track.title}
                        {isCurrent && isPlaying && (
                          <span className="ml-2 text-xs">▶</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {track.artist_name}
                      </p>
                    </button>
                    <button
                      onClick={() => removeFromQueue(index)}
                      className="p-2 text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
