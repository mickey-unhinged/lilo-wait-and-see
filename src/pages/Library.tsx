import { useState, useEffect } from "react";
import { Plus, Grid3X3, List, ChevronDown, Music, Mic2, Heart, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { cn } from "@/lib/utils";
import { Watermark } from "@/components/common/Watermark";
import { PlaylistInvitations } from "@/components/playlist/PlaylistInvitations";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type ViewMode = "grid" | "list";
type FilterType = "all" | "playlists" | "albums" | "artists" | "podcasts";

const filters: { id: FilterType; label: string }[] = [
  { id: "all", label: "All" },
  { id: "playlists", label: "Playlists" },
  { id: "albums", label: "Albums" },
  { id: "artists", label: "Artists" },
  { id: "podcasts", label: "Podcasts" },
];

interface Playlist {
  id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  is_collaborative: boolean;
  is_public: boolean;
  track_count?: number;
}

const Library = () => {
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newPlaylistTitle, setNewPlaylistTitle] = useState("");
  const [newPlaylistDescription, setNewPlaylistDescription] = useState("");
  const [newPlaylistCollaborative, setNewPlaylistCollaborative] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUserId(session?.user?.id || null);
      if (session?.user?.id) {
        fetchPlaylists(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setCurrentUserId(session?.user?.id || null);
      if (session?.user?.id) {
        fetchPlaylists(session.user.id);
      } else {
        setPlaylists([]);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchPlaylists = async (userId: string) => {
    setIsLoading(true);
    try {
      // Fetch owned playlists
      const { data: ownedPlaylists, error: ownedError } = await supabase
        .from("playlists")
        .select("id, title, description, cover_url, is_collaborative, is_public")
        .eq("owner_id", userId)
        .order("created_at", { ascending: false });

      if (ownedError) throw ownedError;

      // Fetch collaborative playlists where user is accepted collaborator
      const { data: collabData, error: collabError } = await supabase
        .from("playlist_collaborators")
        .select(`
          playlists (
            id, title, description, cover_url, is_collaborative, is_public
          )
        `)
        .eq("user_id", userId)
        .not("accepted_at", "is", null);

      if (collabError) throw collabError;

      const collaborativePlaylists = collabData?.map(c => c.playlists).filter(Boolean) as Playlist[] || [];
      const allPlaylists = [...(ownedPlaylists || []), ...collaborativePlaylists];
      
      // Remove duplicates
      const uniquePlaylists = Array.from(new Map(allPlaylists.map(p => [p.id, p])).values());
      
      setPlaylists(uniquePlaylists);
    } catch (error) {
      console.error("Failed to fetch playlists:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePlaylist = async () => {
    if (!currentUserId || !newPlaylistTitle.trim()) {
      toast({ title: "Please enter a playlist name", variant: "destructive" });
      return;
    }

    setIsCreating(true);
    try {
      const { data, error } = await supabase
        .from("playlists")
        .insert({
          owner_id: currentUserId,
          title: newPlaylistTitle.trim(),
          description: newPlaylistDescription.trim() || null,
          is_collaborative: newPlaylistCollaborative,
          is_public: true,
        })
        .select()
        .single();

      if (error) throw error;

      toast({ title: "Playlist created!" });
      setPlaylists(prev => [data, ...prev]);
      setIsCreateOpen(false);
      setNewPlaylistTitle("");
      setNewPlaylistDescription("");
      setNewPlaylistCollaborative(false);
      
      // Navigate to the new playlist
      navigate(`/playlist/${data.id}`);
    } catch (error) {
      console.error("Failed to create playlist:", error);
      toast({ title: "Failed to create playlist", variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  const staticItems = [
    {
      id: "liked",
      type: "playlist" as const,
      title: "Liked Songs",
      subtitle: "Your favorites",
      imageUrl: null,
      icon: Heart,
      isPinned: true,
      route: "/liked-songs",
    },
  ];

  const allItems = [
    ...staticItems,
    ...playlists.map(p => ({
      id: p.id,
      type: "playlist" as const,
      title: p.title,
      subtitle: p.is_collaborative ? "Collaborative playlist" : "Playlist",
      imageUrl: p.cover_url,
      route: `/playlist/${p.id}`,
    })),
  ];

  const filteredItems = allItems.filter((item) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "playlists") return true; // All items are playlists for now
    return true;
  });

  const handleItemClick = (item: typeof allItems[0]) => {
    if (item.route) {
      navigate(item.route);
    }
  };

  return (
    <AppLayout>
      <div className="px-4 pt-12 pb-4">
        {/* Playlist Invitations */}
        <PlaylistInvitations />
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold font-display">Your Library</h1>
          <Sheet open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <SheetTrigger asChild>
              <button className="p-2 rounded-full hover:bg-card transition-colors">
                <Plus className="w-6 h-6" />
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-3xl">
              <SheetHeader>
                <SheetTitle>Create Playlist</SheetTitle>
              </SheetHeader>
              <div className="py-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="playlist-name">Playlist name</Label>
                  <Input
                    id="playlist-name"
                    placeholder="My awesome playlist"
                    value={newPlaylistTitle}
                    onChange={(e) => setNewPlaylistTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="playlist-desc">Description (optional)</Label>
                  <Textarea
                    id="playlist-desc"
                    placeholder="What's this playlist about?"
                    value={newPlaylistDescription}
                    onChange={(e) => setNewPlaylistDescription(e.target.value)}
                    rows={2}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="collaborative">Collaborative</Label>
                    <p className="text-sm text-muted-foreground">Let friends add songs</p>
                  </div>
                  <Switch
                    id="collaborative"
                    checked={newPlaylistCollaborative}
                    onCheckedChange={setNewPlaylistCollaborative}
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={handleCreatePlaylist}
                  disabled={isCreating || !newPlaylistTitle.trim()}
                >
                  {isCreating ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : null}
                  Create Playlist
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
        
        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-4 px-4 pb-4">
          {filters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-300",
                activeFilter === filter.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-foreground hover:bg-card/80"
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
        
        {/* Sort & View controls */}
        <div className="flex items-center justify-between py-3">
          <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <span>Recently played</span>
            <ChevronDown className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "p-2 rounded-lg transition-colors",
                viewMode === "list" ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <List className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={cn(
                "p-2 rounded-lg transition-colors",
                viewMode === "grid" ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Grid3X3 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Library items */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className={cn(
          "px-4 pb-8",
          viewMode === "grid" ? "grid grid-cols-2 gap-4" : "flex flex-col gap-2"
        )}>
          {filteredItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleItemClick(item)}
              className={cn(
                "group transition-all duration-300",
                viewMode === "grid"
                  ? "flex flex-col text-left"
                  : "flex items-center gap-3 p-2 rounded-xl hover:bg-card/50"
              )}
            >
              {/* Image */}
              <div className={cn(
                "relative overflow-hidden",
                viewMode === "grid" ? "w-full aspect-square rounded-xl mb-3" : "w-14 h-14 rounded-lg shrink-0"
              )}>
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                ) : "icon" in item && item.icon ? (
                  <div className="w-full h-full gradient-bg flex items-center justify-center">
                    <item.icon className="w-6 h-6 text-primary-foreground" />
                  </div>
                ) : (
                  <div className="w-full h-full bg-card flex items-center justify-center">
                    <Music className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
                
                {"isPinned" in item && item.isPinned && (
                  <div className="absolute bottom-1 right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                    <span className="text-xs">📌</span>
                  </div>
                )}
              </div>
              
              {/* Info */}
              <div className={cn(
                "min-w-0",
                viewMode === "grid" ? "" : "flex-1"
              )}>
                <h3 className="font-medium text-sm truncate">{item.title}</h3>
                <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                  {item.subtitle}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Watermark */}
      <div className="px-4 pb-8 text-center">
        <Watermark variant="subtle" />
      </div>
    </AppLayout>
  );
};

export default Library;