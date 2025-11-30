import { useState, useEffect } from "react";
import { Search as SearchIcon, X, Mic, TrendingUp, Music } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { SearchResults } from "@/components/search/SearchResults";
import { useLiveVideoSearch } from "@/hooks/useLiveVideoSearch";
import { useMusicSearch } from "@/hooks/useMusicSearch";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/useDebounce";
import { Watermark } from "@/components/common/Watermark";
import type { Track } from "@/contexts/PlayerContext";
import { useVoiceSearch } from "@/hooks/useVoiceSearch";
import { useSearchHistory } from "@/hooks/useSearchHistory";

type SearchSource = "live" | "itunes";

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

// Dynamic trending searches that rotate based on time
const getTrendingSearches = () => {
  const allTrending = [
    ["Taylor Swift", "Drake", "The Weeknd", "Bad Bunny", "Morgan Wallen", "SZA"],
    ["Beyoncé", "Kendrick Lamar", "Doja Cat", "Post Malone", "Dua Lipa", "Ed Sheeran"],
    ["Billie Eilish", "Harry Styles", "Olivia Rodrigo", "Travis Scott", "Ariana Grande", "Justin Bieber"],
    ["Rihanna", "Bruno Mars", "Cardi B", "Lil Baby", "21 Savage", "Future"],
    ["Miley Cyrus", "Lizzo", "Jack Harlow", "Ice Spice", "Metro Boomin", "Tyler, The Creator"],
    ["BTS", "BLACKPINK", "NewJeans", "Stray Kids", "Seventeen", "aespa"],
  ];
  
  // Rotate every 2 hours
  const rotationIndex = Math.floor(Date.now() / (1000 * 60 * 120)) % allTrending.length;
  return allTrending[rotationIndex];
};

const Search = () => {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [searchSource, setSearchSource] = useState<SearchSource>("live");
  const [trendingSearches, setTrendingSearches] = useState<string[]>(getTrendingSearches());
  const debouncedQuery = useDebounce(query, 400);
  const { addToHistory } = useSearchHistory();
  
  // Update trending searches periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setTrendingSearches(getTrendingSearches());
    }, 60 * 1000); // Check every minute
    return () => clearInterval(interval);
  }, []);
  
  const liveVideo = useLiveVideoSearch();
  const iTunes = useMusicSearch();
  const { results: liveResults, isLoading: liveLoading, searchMusic: searchLive, clearResults: clearLive } = liveVideo;
  const { results: itunesResults, isLoading: itunesLoading, searchMusic: searchItunes, clearResults: clearItunes } = iTunes;
  const {
    isSupported: micSupported,
    isListening,
    error: micError,
    startListening,
    stopListening,
  } = useVoiceSearch((spokenText) => {
    setQuery(spokenText);
    setIsFocused(true);
  });
  
  const results: Track[] = searchSource === "live" ? liveResults : itunesResults;
  const isLoading = searchSource === "live" ? liveLoading : itunesLoading;

  // Search when debounced query changes and save to history
  useEffect(() => {
    if (debouncedQuery.trim()) {
      // Save search to history for personalized recommendations
      addToHistory(debouncedQuery);
      
      if (searchSource === "live") {
        searchLive(debouncedQuery);
      } else {
        searchItunes(debouncedQuery);
      }
    } else {
      clearLive();
      clearItunes();
    }
  }, [debouncedQuery, searchSource, searchLive, searchItunes, clearLive, clearItunes, addToHistory]);

  const handleGenreClick = (genreName: string) => {
    setQuery(genreName);
    setIsFocused(true);
  };

  const handleMoodClick = (moodName: string) => {
    setQuery(`${moodName} music`);
    setIsFocused(true);
  };

  const handleTrendingClick = (search: string) => {
    setQuery(search);
    setIsFocused(true);
  };

  const showResults = query.trim().length > 0;

  return (
    <AppLayout>
      <div className="px-4 pt-12 pb-6">
        {/* Header */}
        <h1 className="text-3xl font-bold font-display mb-6">Search</h1>

        {/* Search input */}
        <div
          className={cn(
            "relative flex items-center gap-3 bg-card rounded-2xl px-4 py-3 transition-all duration-300",
            isFocused && "ring-2 ring-primary/50 bg-card/80"
          )}
        >
          <SearchIcon className="w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setTimeout(() => setIsFocused(false), 200)}
            placeholder="Search any song, artist, or album..."
            className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
          />
          {query ? (
            <button
              onClick={() => {
                setQuery("");
                clearLive();
                clearItunes();
              }}
              className="p-1"
            >
              <X className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" />
            </button>
          ) : (
            <button
              className={cn(
                "p-1 rounded-full transition-colors",
                !micSupported && "opacity-40 cursor-not-allowed",
                isListening && "bg-primary/10 text-primary"
              )}
              onClick={() => {
                if (!micSupported) return;
                if (isListening) {
                  stopListening();
                } else {
                  startListening();
                }
              }}
              type="button"
            >
              <Mic
                className={cn(
                  "w-5 h-5",
                  isListening ? "text-primary" : "text-muted-foreground hover:text-primary"
                )}
              />
            </button>
          )}
        </div>
        {micError ? (
          <p className="text-xs text-destructive mt-2 px-1">{micError}</p>
        ) : (
          !micSupported && (
            <p className="text-xs text-muted-foreground mt-2 px-1">
              Voice search isn't supported in this browser.
            </p>
          )
        )}

        {/* Source Toggle */}
        <div className="flex items-center justify-center gap-2 mt-3">
          <button
            onClick={() => setSearchSource("live")}
            className={cn(
              "px-4 py-1.5 rounded-full text-xs font-medium transition-all",
              searchSource === "live"
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:text-foreground"
            )}
          >
            Lilo Live
          </button>
          <button
            onClick={() => setSearchSource("itunes")}
            className={cn(
              "px-4 py-1.5 rounded-full text-xs font-medium transition-all",
              searchSource === "itunes"
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:text-foreground"
            )}
          >
            iTunes (30s preview)
          </button>
        </div>

        {/* Info badge */}
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Search millions of songs • 30-second previews available
        </p>
      </div>

      {/* Search Results */}
      {showResults ? (
        <section className="px-4 pb-8">
          <SearchResults results={results} isLoading={isLoading} />
          {!isLoading && results.length === 0 && query.trim() && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No results found for "{query}"</p>
              <p className="text-sm text-muted-foreground mt-1">Try a different search term</p>
            </div>
          )}
        </section>
      ) : (
        <>
          {/* Trending Searches */}
          <section className="px-4 py-4">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Trending</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {trendingSearches.map((search) => (
                <button
                  key={search}
                  onClick={() => handleTrendingClick(search)}
                  className="px-4 py-2 rounded-full bg-card hover:bg-card/80 text-sm font-medium transition-colors"
                >
                  {search}
                </button>
              ))}
            </div>
          </section>

          {/* Moods */}
          <section className="px-4 py-4">
            <h2 className="text-lg font-semibold mb-4">Browse by mood</h2>
            <div className="grid grid-cols-3 gap-3">
              {moods.map((mood) => (
                <button
                  key={mood.id}
                  onClick={() => handleMoodClick(mood.name)}
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
                  onClick={() => handleGenreClick(genre.name)}
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

          {/* Watermark */}
          <div className="px-4 pb-8 text-center">
            <Watermark variant="subtle" />
          </div>
        </>
      )}
    </AppLayout>
  );
};

export default Search;
