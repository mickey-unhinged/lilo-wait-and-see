import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { PlayerProvider } from "@/contexts/PlayerContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Index from "./pages/Index";
import Search from "./pages/Search";
import Library from "./pages/Library";
import Player from "./pages/Player";
import Profile from "./pages/Profile";
import Auth from "./pages/Auth";
import Playlist from "./pages/Playlist";
import LikedSongs from "./pages/LikedSongs";
import SectionView from "./pages/SectionView";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <PlayerProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/search" element={<Search />} />
              <Route path="/library" element={<Library />} />
              <Route path="/player" element={<Player />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/playlist/:id" element={<Playlist />} />
              <Route path="/liked-songs" element={<LikedSongs />} />
              <Route path="/section/:section" element={<SectionView />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </PlayerProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
