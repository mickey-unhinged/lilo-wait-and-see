import { SectionHeader } from "./SectionHeader";
import { HorizontalScroll } from "./HorizontalScroll";
import { ArtistCard } from "./ArtistCard";

const topArtists = [
  {
    id: "1",
    name: "Luna Echo",
    imageUrl: "https://images.unsplash.com/photo-1614149162883-504ce4d13909?w=200&h=200&fit=crop",
    followers: "2.4M",
  },
  {
    id: "2",
    name: "The Midnight",
    imageUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200&h=200&fit=crop",
    followers: "1.8M",
  },
  {
    id: "3",
    name: "Neon Dreams",
    imageUrl: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=200&h=200&fit=crop",
    followers: "3.1M",
  },
  {
    id: "4",
    name: "Aurora",
    imageUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=200&h=200&fit=crop",
    followers: "5.2M",
  },
  {
    id: "5",
    name: "Coastal",
    imageUrl: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=200&h=200&fit=crop",
    followers: "890K",
  },
];

export function TopArtistsSection() {
  return (
    <section className="px-4 py-4">
      <SectionHeader 
        title="Your Top Artists" 
        subtitle="Based on your listening"
      />
      <HorizontalScroll>
        {topArtists.map((artist) => (
          <ArtistCard
            key={artist.id}
            name={artist.name}
            imageUrl={artist.imageUrl}
            followers={artist.followers}
          />
        ))}
      </HorizontalScroll>
    </section>
  );
}
