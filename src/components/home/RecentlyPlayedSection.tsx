import { SectionHeader } from "./SectionHeader";
import { HorizontalScroll } from "./HorizontalScroll";
import { TrackCard } from "./TrackCard";

const recentTracks = [
  {
    id: "1",
    title: "Midnight Dreams",
    artist: "Luna Echo",
    imageUrl: "https://images.unsplash.com/photo-1614149162883-504ce4d13909?w=200&h=200&fit=crop",
    isPlaying: true,
  },
  {
    id: "2",
    title: "Electric Nights",
    artist: "Neon Dreams",
    imageUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200&h=200&fit=crop",
  },
  {
    id: "3",
    title: "Ocean Waves",
    artist: "The Midnight",
    imageUrl: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=200&h=200&fit=crop",
  },
  {
    id: "4",
    title: "Starlight",
    artist: "Aurora",
    imageUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=200&h=200&fit=crop",
  },
  {
    id: "5",
    title: "Summer Haze",
    artist: "Coastal",
    imageUrl: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=200&h=200&fit=crop",
  },
];

export function RecentlyPlayedSection() {
  return (
    <section className="px-4 py-4">
      <SectionHeader 
        title="Recently Played" 
        subtitle="Jump back in"
      />
      <HorizontalScroll>
        {recentTracks.map((track) => (
          <TrackCard
            key={track.id}
            title={track.title}
            artist={track.artist}
            imageUrl={track.imageUrl}
            isPlaying={track.isPlaying}
          />
        ))}
      </HorizontalScroll>
    </section>
  );
}
