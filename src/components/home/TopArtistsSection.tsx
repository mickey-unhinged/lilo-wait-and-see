import { useQuery } from "@tanstack/react-query";
import { SectionHeader } from "./SectionHeader";
import { HorizontalScroll } from "./HorizontalScroll";
import { ArtistCard } from "./ArtistCard";
import { supabase } from "@/integrations/supabase/client";
import { Users } from "lucide-react";

export function TopArtistsSection() {
  const { data: artists, isLoading } = useQuery({
    queryKey: ["top-artists"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("artists")
        .select("*")
        .order("monthly_listeners", { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data;
    },
  });

  const formatFollowers = (count: number | null) => {
    if (!count) return "0";
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(0)}K`;
    return count.toString();
  };

  if (!isLoading && (!artists || artists.length === 0)) {
    return (
      <section className="px-4 py-4">
        <SectionHeader 
          title="Your Top Artists" 
          subtitle="Based on your listening"
        />
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-card/50 flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">No artists yet</p>
          <p className="text-sm text-muted-foreground/70">Discover new music to find your favorites</p>
        </div>
      </section>
    );
  }

  return (
    <section className="px-4 py-4">
      <SectionHeader 
        title="Your Top Artists" 
        subtitle="Based on your listening"
      />
      <HorizontalScroll>
        {artists?.map((artist) => (
          <ArtistCard
            key={artist.id}
            name={artist.name}
            imageUrl={artist.avatar_url || "https://images.unsplash.com/photo-1614149162883-504ce4d13909?w=200&h=200&fit=crop"}
            followers={formatFollowers(artist.monthly_listeners)}
          />
        ))}
      </HorizontalScroll>
    </section>
  );
}
