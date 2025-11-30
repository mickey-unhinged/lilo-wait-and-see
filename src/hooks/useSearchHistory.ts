import { useState, useEffect, useCallback } from "react";

const LOCAL_STORAGE_KEY = "lilo-search-history";
const MAX_HISTORY = 30;

interface SearchEntry {
  query: string;
  searchedAt: string;
}

export function useSearchHistory() {
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    loadFromLocalStorage();
  }, []);

  const loadFromLocalStorage = () => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed: SearchEntry[] = JSON.parse(stored);
        parsed.sort((a, b) => new Date(b.searchedAt).getTime() - new Date(a.searchedAt).getTime());
        setHistory(parsed.map(p => p.query));
      }
    } catch (e) {
      console.error("Failed to parse search history:", e);
    }
  };

  const addToHistory = useCallback((query: string) => {
    if (!query || query.trim().length < 2) return;
    
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      let entries: SearchEntry[] = stored ? JSON.parse(stored) : [];
      
      // Remove existing entry for this query (case-insensitive)
      entries = entries.filter(e => e.query.toLowerCase() !== query.toLowerCase());
      
      // Add new entry at the beginning
      entries.unshift({
        query: query.trim(),
        searchedAt: new Date().toISOString(),
      });
      
      // Limit history size
      if (entries.length > MAX_HISTORY) {
        entries = entries.slice(0, MAX_HISTORY);
      }
      
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(entries));
      setHistory(entries.map(e => e.query));
    } catch (e) {
      console.error("Failed to save search history:", e);
    }
  }, []);

  const getRecentSearchTerms = useCallback((limit = 5): string[] => {
    return history.slice(0, limit);
  }, [history]);

  const clearHistory = useCallback(() => {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    setHistory([]);
  }, []);

  return {
    history,
    addToHistory,
    getRecentSearchTerms,
    clearHistory,
  };
}

// Utility function to extract keywords from search queries
export function extractKeywordsFromHistory(): string[] {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!stored) return [];
    
    const entries: SearchEntry[] = JSON.parse(stored);
    // Get unique terms, prioritizing recent searches
    const terms = entries.slice(0, 10).map(e => e.query);
    return [...new Set(terms)];
  } catch {
    return [];
  }
}
