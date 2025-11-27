import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";

export function HeroSection() {
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
            Good evening
          </h1>
          <p className="text-muted-foreground">
            Let the music guide your mood
          </p>
        </div>
        
        {/* Featured mix card */}
        <div className="relative rounded-3xl overflow-hidden glass glow-primary">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-transparent to-accent/20" />
          
          <div className="relative p-6">
            <div className="flex items-start gap-4">
              {/* Mix artwork */}
              <div className="relative shrink-0">
                <img
                  src="https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200&h=200&fit=crop"
                  alt="Daily Mix"
                  className="w-28 h-28 rounded-2xl object-cover shadow-lg"
                />
                <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg glow-primary">
                  <Play className="w-5 h-5 text-primary-foreground ml-0.5" fill="currentColor" />
                </div>
              </div>
              
              {/* Mix info */}
              <div className="flex-1 pt-2">
                <span className="text-xs font-medium text-primary uppercase tracking-wider">
                  Made for you
                </span>
                <h2 className="text-xl font-bold font-display mt-1 mb-2">
                  Your Daily Mix
                </h2>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  Luna Echo, The Midnight, Neon Dreams and more based on your recent listening
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 mt-5">
              <Button className="rounded-full px-6 gradient-bg text-primary-foreground border-0 shadow-lg">
                Play Now
              </Button>
              <Button variant="outline" className="rounded-full px-6 glass border-border/50">
                Save
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
