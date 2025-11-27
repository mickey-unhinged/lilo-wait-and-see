import { AppLayout } from "@/components/layout/AppLayout";
import { HeroSection } from "@/components/home/HeroSection";
import { QuickAccessGrid } from "@/components/home/QuickAccessGrid";
import { RecentlyPlayedSection } from "@/components/home/RecentlyPlayedSection";
import { TrendingSection } from "@/components/home/TrendingSection";
import { TopArtistsSection } from "@/components/home/TopArtistsSection";

const Index = () => {
  return (
    <AppLayout>
      <HeroSection />
      <QuickAccessGrid />
      <RecentlyPlayedSection />
      <TrendingSection />
      <TopArtistsSection />
    </AppLayout>
  );
};

export default Index;
