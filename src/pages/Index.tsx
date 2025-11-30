import { AppLayout } from "@/components/layout/AppLayout";
import { HeroSection } from "@/components/home/HeroSection";
import { QuickAccessGrid } from "@/components/home/QuickAccessGrid";
import { RecentlyPlayedSection } from "@/components/home/RecentlyPlayedSection";
import { ForYouSection } from "@/components/home/ForYouSection";
import { DailyMixSection } from "@/components/home/DailyMixSection";
import { TrendingSection } from "@/components/home/TrendingSection";
import { TopArtistsSection } from "@/components/home/TopArtistsSection";
import { Watermark } from "@/components/common/Watermark";
import { FriendsActivity } from "@/components/home/FriendsActivity";
import { CuratedPlaylistsSection } from "@/components/home/CuratedPlaylistsSection";
import { DiscoverWeeklySection } from "@/components/home/DiscoverWeeklySection";
import { ListeningRoomsSheet } from "@/components/rooms/ListeningRoomsSheet";
import { Radio } from "lucide-react";

const Index = () => {
  return (
    <AppLayout>
      <HeroSection />
      
      {/* Listening Rooms Banner */}
      <div className="px-4 py-2">
        <ListeningRoomsSheet
          trigger={
            <button className="w-full flex items-center gap-3 p-4 bg-gradient-to-r from-primary/20 to-purple-500/20 rounded-2xl border border-primary/20 hover:border-primary/40 transition-colors">
              <div className="p-2 rounded-xl bg-primary/20">
                <Radio className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium">Listening Rooms</p>
                <p className="text-xs text-muted-foreground">Listen together with friends in real-time</p>
              </div>
              <span className="text-xs px-2 py-1 bg-primary/20 text-primary rounded-full">New</span>
            </button>
          }
        />
      </div>
      
      <QuickAccessGrid />
      <RecentlyPlayedSection />
      <DiscoverWeeklySection />
      <CuratedPlaylistsSection />
      <ForYouSection />
      <DailyMixSection />
      <FriendsActivity />
      <TrendingSection />
      <TopArtistsSection />
      
      {/* Watermark */}
      <div className="px-4 py-8 text-center">
        <Watermark variant="subtle" />
      </div>
    </AppLayout>
  );
};

export default Index;
