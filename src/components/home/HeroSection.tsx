import { Play, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export function HeroSection() {
  const navigate = useNavigate();
  
  // Get time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <section className="relative overflow-hidden">
      {/* Ambient background */}
      <div className="absolute inset-0 gradient-ambient opacity-50" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[300px] bg-accent/15 rounded-full blur-[100px]" />
      
      <div className="relative px-4 pt-12 pb-8">
        {/* Greeting */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold font-display mb-2">
            {getGreeting()}
          </h1>
          <p className="text-muted-foreground">
            Let the music guide your mood
          </p>
        </div>
        
        {/* Get started card */}
        <div className="relative rounded-3xl overflow-hidden glass glow-primary">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-transparent to-accent/20" />
          
          <div className="relative p-6">
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div className="relative shrink-0">
                <div className="w-28 h-28 rounded-2xl gradient-bg flex items-center justify-center shadow-lg">
                  <Search className="w-12 h-12 text-primary-foreground" />
                </div>
              </div>
              
              {/* Info */}
              <div className="flex-1 pt-2">
                <span className="text-xs font-medium text-primary uppercase tracking-wider">
                  Discover
                </span>
                <h2 className="text-xl font-bold font-display mt-1 mb-2">
                  Find Your Sound
                </h2>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  Search for any song, artist, or album. Stream music from millions of tracks.
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 mt-5">
              <Button 
                onClick={() => navigate("/search")}
                className="rounded-full px-6 gradient-bg text-primary-foreground border-0 shadow-lg"
              >
                <Search className="w-4 h-4 mr-2" />
                Search Music
              </Button>
              <Button 
                onClick={() => navigate("/library")}
                variant="outline" 
                className="rounded-full px-6 glass border-border/50"
              >
                My Library
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
