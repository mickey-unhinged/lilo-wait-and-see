import { AppLayout } from "@/components/layout/AppLayout";
import { HeroSection } from "@/components/home/HeroSection";
import { QuickAccessGrid } from "@/components/home/QuickAccessGrid";
import { RecentlyPlayedSection } from "@/components/home/RecentlyPlayedSection";
import { TrendingSection } from "@/components/home/TrendingSection";
import { TopArtistsSection } from "@/components/home/TopArtistsSection";
import { Watermark } from "@/components/common/Watermark";

const Index = () => {
  return (
    <AppLayout>
      <HeroSection />
      <QuickAccessGrid />
      <RecentlyPlayedSection />
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
