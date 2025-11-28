import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Track {
  id: string;
  title: string;
  artist_id: string;
  artist_name: string;
  cover_url: string;
  duration_ms: number;
  videoId: string;
}

// Use Invidious API as primary source (more reliable)
async function fetchFromInvidious(): Promise<Track[]> {
  const instances = [
    "https://invidious.fdn.fr",
    "https://inv.nadeko.net",
    "https://invidious.nerdvpn.de",
    "https://yt.artemislena.eu",
  ];

  for (const instance of instances) {
    try {
      // Fetch trending music
      const response = await fetch(`${instance}/api/v1/trending?type=music&region=US`, {
        headers: { 
          "User-Agent": "Lilo/1.0",
          "Accept": "application/json",
        },
      });

      if (!response.ok) {
        console.log(`Invidious ${instance} returned ${response.status}`);
        continue;
      }

      const data = await response.json();
      const tracks: Track[] = [];

      for (const item of data) {
        // Only include music videos (shorter duration)
        if (item.lengthSeconds && item.lengthSeconds < 600 && item.lengthSeconds > 60) {
          tracks.push({
            id: `ytm-${item.videoId}`,
            title: item.title,
            artist_id: item.authorId || item.videoId,
            artist_name: item.author || "Unknown Artist",
            cover_url: item.videoThumbnails?.[0]?.url || `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg`,
            duration_ms: (item.lengthSeconds || 180) * 1000,
            videoId: item.videoId,
          });
        }
      }

      if (tracks.length > 0) {
        console.log(`Found ${tracks.length} tracks from ${instance}`);
        return tracks.slice(0, 20);
      }
    } catch (e) {
      console.error(`Invidious instance ${instance} failed:`, e);
    }
  }

  return [];
}

// Search using Invidious
async function searchInvidious(query: string): Promise<Track[]> {
  const instances = [
    "https://invidious.fdn.fr",
    "https://inv.nadeko.net",
    "https://invidious.nerdvpn.de",
  ];

  for (const instance of instances) {
    try {
      const response = await fetch(
        `${instance}/api/v1/search?q=${encodeURIComponent(query)}&type=video&sort=relevance`,
        {
          headers: { 
            "User-Agent": "Lilo/1.0",
            "Accept": "application/json",
          },
        }
      );

      if (!response.ok) continue;

      const data = await response.json();
      const tracks: Track[] = [];

      for (const item of data) {
        if (item.type === "video" && item.lengthSeconds && item.lengthSeconds < 600) {
          tracks.push({
            id: `ytm-${item.videoId}`,
            title: item.title,
            artist_id: item.authorId || item.videoId,
            artist_name: item.author || "Unknown Artist",
            cover_url: item.videoThumbnails?.[0]?.url || `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg`,
            duration_ms: (item.lengthSeconds || 180) * 1000,
            videoId: item.videoId,
          });
        }
      }

      if (tracks.length > 0) {
        return tracks.slice(0, 10);
      }
    } catch (e) {
      console.error(`Search on ${instance} failed:`, e);
    }
  }

  return [];
}

// Fallback: curated list of popular songs
function getFallbackTracks(): Track[] {
  const popularSongs = [
    { title: "Blinding Lights", artist: "The Weeknd", videoId: "4NRXx6U8ABQ" },
    { title: "Shape of You", artist: "Ed Sheeran", videoId: "JGwWNGJdvx8" },
    { title: "Dance Monkey", artist: "Tones and I", videoId: "q0hyYWKXF0Q" },
    { title: "Someone You Loved", artist: "Lewis Capaldi", videoId: "zABLecsR5UE" },
    { title: "Watermelon Sugar", artist: "Harry Styles", videoId: "E07s5ZYygMg" },
    { title: "Don't Start Now", artist: "Dua Lipa", videoId: "oygrmJFKYZY" },
    { title: "Levitating", artist: "Dua Lipa", videoId: "TUVcZfQe-Kw" },
    { title: "Stay", artist: "The Kid LAROI & Justin Bieber", videoId: "kTJczUoc26U" },
    { title: "Heat Waves", artist: "Glass Animals", videoId: "mRD0-GxqHVo" },
    { title: "As It Was", artist: "Harry Styles", videoId: "H5v3kku4y6Q" },
    { title: "Anti-Hero", artist: "Taylor Swift", videoId: "b1kbLwvqugk" },
    { title: "Flowers", artist: "Miley Cyrus", videoId: "G7KNmW9a75Y" },
    { title: "Kill Bill", artist: "SZA", videoId: "hTGdWMlPPRc" },
    { title: "Unholy", artist: "Sam Smith & Kim Petras", videoId: "Uq9gPaIzbe8" },
    { title: "Calm Down", artist: "Rema & Selena Gomez", videoId: "CQLsdm1ZYAw" },
  ];

  return popularSongs.map((song, index) => ({
    id: `ytm-${song.videoId}`,
    title: song.title,
    artist_id: song.videoId,
    artist_name: song.artist,
    cover_url: `https://i.ytimg.com/vi/${song.videoId}/hqdefault.jpg`,
    duration_ms: 200000,
    videoId: song.videoId,
  }));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // No body provided, use defaults
    }

    const { type, seedArtists, seedGenres, limit = 20 } = body;

    console.log("Fetching suggestions...", { type, seedArtists, seedGenres });

    let tracks: Track[] = [];

    if (type === "personalized" && (seedArtists?.length > 0 || seedGenres?.length > 0)) {
      // Personalized recommendations based on user's listening history
      const queries = seedArtists?.length > 0 
        ? seedArtists.map((a: string) => `${a} songs`)
        : seedGenres.map((g: string) => `${g} music 2024`);

      // Search for each artist/genre and combine results
      const allTracks: Track[] = [];
      for (const query of queries.slice(0, 3)) {
        const results = await searchInvidious(query);
        allTracks.push(...results);
      }

      // Shuffle and dedupe
      const seen = new Set<string>();
      tracks = allTracks.filter(t => {
        if (seen.has(t.id)) return false;
        seen.add(t.id);
        return true;
      }).sort(() => Math.random() - 0.5).slice(0, limit);

      // If not enough personalized results, add some trending/fallback
      if (tracks.length < limit / 2) {
        const trending = await fetchFromInvidious();
        const fallback = trending.length > 0 ? trending : getFallbackTracks();
        for (const t of fallback) {
          if (!seen.has(t.id)) {
            tracks.push(t);
            if (tracks.length >= limit) break;
          }
        }
      }
    } else {
      // Default: fetch trending
      tracks = await fetchFromInvidious();
      
      // Use fallback if no results
      if (tracks.length === 0) {
        console.log("Invidious failed, using fallback tracks");
        tracks = getFallbackTracks();
      }
    }

    console.log(`Returning ${tracks.length} tracks`);

    return new Response(JSON.stringify({ tracks: tracks.slice(0, limit) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Suggestions error:", error);
    // Return fallback tracks on error
    return new Response(
      JSON.stringify({ tracks: getFallbackTracks().slice(0, 20) }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});