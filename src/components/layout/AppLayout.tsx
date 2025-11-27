import { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { MiniPlayer } from "../player/MiniPlayer";
import { usePlayer } from "@/contexts/PlayerContext";

interface AppLayoutProps {
  children: ReactNode;
  showPlayer?: boolean;
}

export function AppLayout({ children, showPlayer = true }: AppLayoutProps) {
  const { currentTrack } = usePlayer();
  
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Main content area */}
      <main className={`flex-1 overflow-y-auto hide-scrollbar ${currentTrack ? 'pb-40' : 'pb-24'}`}>
        {children}
      </main>
      
      {/* Fixed bottom section */}
      <div className="fixed bottom-0 left-0 right-0 z-50 safe-bottom">
        {showPlayer && <MiniPlayer />}
        <BottomNav />
      </div>
    </div>
  );
}
