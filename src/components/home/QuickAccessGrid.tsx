import { Play } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { usePlayer } from "@/contexts/PlayerContext";

interface QuickAccessItem {
  id: string;
  title: string;
  imageUrl: string;
  type: "playlist" | "album" | "artist";
}

const quickAccessItems: QuickAccessItem[] = [
  {
    id: "liked",
    title: "Liked Songs",
    imageUrl: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=100&h=100&fit=crop",
    type: "playlist",
  },
  {
    id: "2",
    title: "Chill Vibes",
    imageUrl: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=100&h=100&fit=crop",
    type: "playlist",
  },
  {
    id: "3",
    title: "Night Drive",
    imageUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=100&h=100&fit=crop",
    type: "playlist",
  },
  {
    id: "4",
    title: "Workout Mix",
    imageUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=100&h=100&fit=crop",
    type: "playlist",
  },
  {
    id: "5",
    title: "Focus Flow",
    imageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
    type: "playlist",
  },
  {
    id: "artist-1",
    title: "Luna Echo",
    imageUrl: "https://images.unsplash.com/photo-1614149162883-504ce4d13909?w=100&h=100&fit=crop",
    type: "artist",
  },
];

export function QuickAccessGrid() {
  const navigate = useNavigate();
  
  const handleItemClick = (item: QuickAccessItem) => {
    if (item.type === "playlist") {
      navigate(`/playlist/${item.id}`);
    }
    // Artists and albums can be handled later
  };

  return (
    <section className="px-4 py-6">
      <div className="grid grid-cols-2 gap-3">
        {quickAccessItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleItemClick(item)}
            className="flex items-center gap-3 bg-card/50 hover:bg-card/80 rounded-xl overflow-hidden transition-all duration-300 group"
          >
            <img
              src={item.imageUrl}
              alt={item.title}
              className="w-14 h-14 object-cover"
            />
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
