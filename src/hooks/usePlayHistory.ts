import { useState, useEffect, useCallback } from "react";
import type { Track } from "@/contexts/PlayerContext";

const LOCAL_STORAGE_KEY = "lilo-play-history";
const MAX_HISTORY = 50;

interface PlayHistoryEntry {
  track: Track;
  playedAt: string;
}

export function usePlayHistory() {
  const [history, setHistory] = useState<Track[]>([]);

  // Load history from localStorage on mount
  useEffect(() => {
    loadFromLocalStorage();
  }, []);

  const loadFromLocalStorage = () => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed: PlayHistoryEntry[] = JSON.parse(stored);
        // Sort by playedAt descending (most recent first)
        parsed.sort((a, b) => new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime());
        setHistory(parsed.map(p => p.track));
      }
    } catch (e) {
      console.error("Failed to parse play history from localStorage:", e);
    }
  };

  const addToHistory = useCallback((track: Track) => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      let entries: PlayHistoryEntry[] = stored ? JSON.parse(stored) : [];
      
      // Remove existing entry for this track (to move it to top)
      entries = entries.filter(e => e.track.id !== track.id);
      
      // Add new entry at the beginning
      entries.unshift({
        track,
        playedAt: new Date().toISOString(),
      });
      
      // Limit history size
      if (entries.length > MAX_HISTORY) {
        entries = entries.slice(0, MAX_HISTORY);
      }
      
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(entries));
      setHistory(entries.map(e => e.track));
    } catch (e) {
      console.error("Failed to save play history:", e);
    }
  }, []);

  const clearHistory = useCallback(() => {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    setHistory([]);
  }, []);

  return {
    history,
    addToHistory,
    clearHistory,
  };
}
