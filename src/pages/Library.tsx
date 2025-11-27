import { useState } from "react";
import { Plus, Grid3X3, List, ChevronDown, Music, Mic2, Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { cn } from "@/lib/utils";

type ViewMode = "grid" | "list";
type FilterType = "all" | "playlists" | "albums" | "artists" | "podcasts";

const filters: { id: FilterType; label: string }[] = [
  { id: "all", label: "All" },
  { id: "playlists", label: "Playlists" },
  { id: "albums", label: "Albums" },
  { id: "artists", label: "Artists" },
  { id: "podcasts", label: "Podcasts" },
];

const libraryItems = [
  {
    id: "liked",
    type: "playlist" as const,
    title: "Liked Songs",
    subtitle: "324 songs",
    imageUrl: null,
    icon: Heart,
    isPinned: true,
  },
  {
    id: "2",
    type: "playlist" as const,
    title: "Chill Vibes",
    subtitle: "By You • 48 songs",
    imageUrl: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=200&h=200&fit=crop",
  },
  {
    id: "album-1",
    type: "album" as const,
    title: "After Hours",
    subtitle: "The Weeknd",
    imageUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200&h=200&fit=crop",
  },
  {
    id: "artist-1",
    type: "artist" as const,
    title: "Luna Echo",
    subtitle: "Artist",
    imageUrl: "https://images.unsplash.com/photo-1614149162883-504ce4d13909?w=200&h=200&fit=crop",
  },
  {
    id: "3",
    type: "playlist" as const,
    title: "Night Drive",
    subtitle: "By You • 62 songs",
    imageUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=200&h=200&fit=crop",
  },
  {
    id: "album-2",
    type: "album" as const,
    title: "Starboy",
    subtitle: "The Weeknd",
    imageUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=200&h=200&fit=crop",
  },
  {
    id: "artist-2",
    type: "artist" as const,
    title: "Neon Dreams",
    subtitle: "Artist",
    imageUrl: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=200&h=200&fit=crop",
  },
];

const Library = () => {
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const navigate = useNavigate();

  const filteredItems = libraryItems.filter((item) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "playlists") return item.type === "playlist";
    if (activeFilter === "albums") return item.type === "album";
    if (activeFilter === "artists") return item.type === "artist";
    return true;
  });

  const handleItemClick = (item: typeof libraryItems[0]) => {
    if (item.type === "playlist") {
      navigate(`/playlist/${item.id}`);
    }
    // Albums and artists can be handled later
  };

  return (
    <AppLayout>
      <div className="px-4 pt-12 pb-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold font-display">Your Library</h1>
          <button className="p-2 rounded-full hover:bg-card transition-colors">
            <Plus className="w-6 h-6" />
          </button>
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
              viewMode === "grid" ? "w-full aspect-square rounded-xl mb-3" : "w-14 h-14 rounded-lg shrink-0",
              item.type === "artist" && "rounded-full"
            )}>
              {item.imageUrl ? (
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="w-full h-full object-cover"
                />
              ) : item.icon ? (
                <div className="w-full h-full gradient-bg flex items-center justify-center">
                  <item.icon className="w-6 h-6 text-primary-foreground" />
                </div>
              ) : null}
              
              {item.isPinned && (
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
                {item.type === "artist" && <Mic2 className="w-3 h-3" />}
                {item.type === "album" && <Music className="w-3 h-3" />}
                {item.subtitle}
              </p>
            </div>
          </button>
        ))}
      </div>
    </AppLayout>
  );
};

export default Library;
