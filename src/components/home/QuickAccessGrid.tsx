import { Play, Heart, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function QuickAccessGrid() {
  const navigate = useNavigate();
  
  // Fetch user's playlists
  const { data: playlists } = useQuery({
    queryKey: ["user-playlists"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("playlists")
        .select("*")
        .eq("owner_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data || [];
    },
  });

  // Always show Liked Songs + Search + user playlists
  const quickItems = [
    {
      id: "liked",
      title: "Liked Songs",
      type: "liked" as const,
      imageUrl: null,
    },
    {
      id: "search",
      title: "Search Music",
      type: "search" as const,
      imageUrl: null,
    },
    ...(playlists?.slice(0, 4).map(p => ({
      id: p.id,
      title: p.title,
      type: "playlist" as const,
      imageUrl: p.cover_url,
    })) || []),
  ];

  const handleItemClick = (item: typeof quickItems[0]) => {
    if (item.type === "liked") {
      navigate("/playlist/liked");
    } else if (item.type === "search") {
      navigate("/search");
    } else if (item.type === "playlist") {
      navigate(`/playlist/${item.id}`);
    }
  };

  return (
    <section className="px-4 py-6">
      <div className="grid grid-cols-2 gap-3">
        {quickItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleItemClick(item)}
            className="flex items-center gap-3 bg-card/50 hover:bg-card/80 rounded-xl overflow-hidden transition-all duration-300 group"
          >
            {item.imageUrl ? (
              <img
                src={item.imageUrl}
                alt={item.title}
                className="w-14 h-14 object-cover"
              />
            ) : item.type === "liked" ? (
              <div className="w-14 h-14 gradient-bg flex items-center justify-center">
                <Heart className="w-6 h-6 text-primary-foreground" />
              </div>
            ) : item.type === "search" ? (
              <div className="w-14 h-14 bg-secondary/20 flex items-center justify-center">
                <Search className="w-6 h-6 text-secondary" />
              </div>
            ) : (
              <div className="w-14 h-14 bg-card flex items-center justify-center">
                <Play className="w-6 h-6 text-muted-foreground" />
              </div>
            )}
            <span className="flex-1 text-sm font-medium text-left pr-2 truncate">
              {item.title}
            </span>
            <div className="pr-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-lg">
                <Play className="w-4 h-4 text-primary-foreground ml-0.5" fill="currentColor" />
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
