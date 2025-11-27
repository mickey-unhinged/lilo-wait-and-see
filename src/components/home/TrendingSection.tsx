import { SectionHeader } from "./SectionHeader";
import { HorizontalScroll } from "./HorizontalScroll";
import { TrackCard } from "./TrackCard";

const trendingTracks = [
  {
    id: "1",
    title: "Blinding Lights",
    artist: "The Weeknd",
    imageUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=200&h=200&fit=crop",
  },
  {
    id: "2",
    title: "Heat Waves",
    artist: "Glass Animals",
    imageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop",
  },
  {
    id: "3",
    title: "As It Was",
    artist: "Harry Styles",
    imageUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200&h=200&fit=crop",
  },
  {
    id: "4",
    title: "Bad Habit",
    artist: "Steve Lacy",
    imageUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200&h=200&fit=crop",
  },
  {
    id: "5",
    title: "Anti-Hero",
    artist: "Taylor Swift",
    imageUrl: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=200&h=200&fit=crop",
  },
];

export function TrendingSection() {
  return (
    <section className="px-4 py-4">
      <SectionHeader 
        title="Trending Now" 
        subtitle="What everyone's listening to"
      />
      <HorizontalScroll>
        {trendingTracks.map((track) => (
          <TrackCard
            key={track.id}
            title={track.title}
            artist={track.artist}
            imageUrl={track.imageUrl}
            variant="large"
          />
        ))}
      </HorizontalScroll>
    </section>
  );
}
