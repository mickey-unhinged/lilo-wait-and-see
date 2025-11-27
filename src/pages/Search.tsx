import { useState } from "react";
import { Search as SearchIcon, X, Mic } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { cn } from "@/lib/utils";

const genres = [
  { id: "1", name: "Pop", color: "from-pink-500 to-rose-500" },
  { id: "2", name: "Hip-Hop", color: "from-orange-500 to-amber-500" },
  { id: "3", name: "Rock", color: "from-red-500 to-rose-600" },
  { id: "4", name: "Electronic", color: "from-cyan-500 to-blue-500" },
  { id: "5", name: "R&B", color: "from-purple-500 to-violet-500" },
  { id: "6", name: "Jazz", color: "from-amber-500 to-yellow-500" },
  { id: "7", name: "Classical", color: "from-slate-500 to-gray-600" },
  { id: "8", name: "Indie", color: "from-emerald-500 to-teal-500" },
  { id: "9", name: "Country", color: "from-yellow-600 to-orange-500" },
  { id: "10", name: "Latin", color: "from-red-500 to-orange-500" },
  { id: "11", name: "K-Pop", color: "from-pink-400 to-purple-500" },
  { id: "12", name: "Metal", color: "from-gray-700 to-black" },
];

const moods = [
  { id: "1", name: "Chill", emoji: "😌", color: "from-blue-400 to-cyan-400" },
  { id: "2", name: "Energy", emoji: "⚡", color: "from-yellow-400 to-orange-400" },
  { id: "3", name: "Focus", emoji: "🎯", color: "from-indigo-400 to-purple-400" },
  { id: "4", name: "Sleep", emoji: "🌙", color: "from-slate-500 to-blue-800" },
  { id: "5", name: "Workout", emoji: "💪", color: "from-red-400 to-pink-400" },
  { id: "6", name: "Party", emoji: "🎉", color: "from-fuchsia-500 to-pink-500" },
];

const Search = () => {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  return (
    <AppLayout>
      <div className="px-4 pt-12 pb-6">
        {/* Header */}
        <h1 className="text-3xl font-bold font-display mb-6">Search</h1>
        
        {/* Search input */}
        <div className={cn(
          "relative flex items-center gap-3 bg-card rounded-2xl px-4 py-3 transition-all duration-300",
          isFocused && "ring-2 ring-primary/50 bg-card/80"
        )}>
          <SearchIcon className="w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Songs, artists, podcasts..."
            className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
          />
          {query ? (
            <button onClick={() => setQuery("")} className="p-1">
              <X className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" />
            </button>
          ) : (
            <button className="p-1">
              <Mic className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" />
            </button>
          )}
        </div>
      </div>
      
      {/* Moods */}
      <section className="px-4 py-4">
        <h2 className="text-lg font-semibold mb-4">Browse by mood</h2>
        <div className="grid grid-cols-3 gap-3">
          {moods.map((mood) => (
            <button
              key={mood.id}
              className={cn(
                "relative overflow-hidden rounded-2xl py-6 px-4 bg-gradient-to-br",
                mood.color,
                "hover:scale-105 transition-transform duration-300"
              )}
            >
              <span className="text-2xl mb-1 block">{mood.emoji}</span>
              <span className="text-sm font-medium text-white">{mood.name}</span>
            </button>
          ))}
        </div>
      </section>
      
      {/* Genres */}
      <section className="px-4 py-4 pb-8">
        <h2 className="text-lg font-semibold mb-4">Browse genres</h2>
        <div className="grid grid-cols-2 gap-3">
          {genres.map((genre) => (
            <button
              key={genre.id}
              className={cn(
                "relative overflow-hidden rounded-2xl h-24 bg-gradient-to-br",
                genre.color,
                "hover:scale-105 transition-transform duration-300"
              )}
            >
              <span className="absolute bottom-3 left-4 text-lg font-bold text-white">
                {genre.name}
              </span>
            </button>
          ))}
        </div>
      </section>
    </AppLayout>
  );
};

export default Search;
