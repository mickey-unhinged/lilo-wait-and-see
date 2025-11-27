import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface LyricsResult {
  lyrics: string | null;
  syncedLyrics: string | null;
  source: string | null;
}

export function useLyrics(title: string | undefined, artist: string | undefined) {
  const [lyrics, setLyrics] = useState<string | null>(null);
  const [syncedLyrics, setSyncedLyrics] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!title || !artist) {
      setLyrics(null);
      setSyncedLyrics(null);
      return;
    }

    const fetchLyrics = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const { data, error: fnError } = await supabase.functions.invoke<LyricsResult>("lyrics-search", {
          body: { title, artist },
        });

        if (fnError) throw fnError;

        setLyrics(data?.lyrics || null);
        setSyncedLyrics(data?.syncedLyrics || null);
      } catch (err) {
        console.error("Failed to fetch lyrics:", err);
        setError("Could not load lyrics");
        setLyrics(null);
        setSyncedLyrics(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLyrics();
  }, [title, artist]);

  return { lyrics, syncedLyrics, isLoading, error };
}
