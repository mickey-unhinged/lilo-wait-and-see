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

const MOOD_QUERIES: Record<string, string[]> = {
  chill: ["chill vibes playlist", "lofi beats", "relaxing music", "acoustic chill", "smooth jazz"],
  energy: ["workout music", "high energy hits", "pump up songs", "electronic dance", "hype music"],
  focus: ["study music", "concentration music", "ambient focus", "instrumental focus", "deep work music"],
  happy: ["feel good music", "happy songs", "uplifting music", "positive vibes", "summer hits"],
  workout: ["gym playlist", "running music", "workout motivation", "cardio beats", "fitness music"],
  sleep: ["sleep music", "calm piano", "ambient sleep", "relaxing sounds", "meditation music"],
  party: ["party hits", "club music", "dance party", "weekend vibes", "party anthems"],
  sad: ["sad songs", "emotional music", "heartbreak songs", "melancholy playlist", "sad vibes"],
};

// Use Invidious API as primary source (more reliable)
async function fetchFromInvidious(): Promise<Track[]> {
  const instances = [
    "https://vid.puffyan.us",
    "https://invidious.snopyta.org",
    "https://yewtu.be",
    "https://inv.nadeko.net",
    "https://invidious.nerdvpn.de",
  ];

  for (const instance of instances) {
    try {
      // Fetch trending music
      const response = await fetch(`${instance}/api/v1/trending?type=music&region=US`, {
        headers: { 
          "User-Agent": "Lilo/1.0",
          "Accept": "application/json",
        },
        signal: AbortSignal.timeout(6000),
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
    "https://vid.puffyan.us",
    "https://yewtu.be",
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
          signal: AbortSignal.timeout(6000),
        }
      );

      if (!response.ok) continue;

      const data = await response.json();
      const tracks: Track[] = [];

      for (const item of data) {
        if (item.type === "video" && item.lengthSeconds && item.lengthSeconds < 600 && item.lengthSeconds > 60) {
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

// Expanded fallback list with more variety - rotates based on time
function getFallbackTracks(mood?: string, seed?: number): Track[] {
  const moodTracks: Record<string, Array<{ title: string; artist: string; videoId: string }>> = {
    chill: [
      { title: "Sunflower", artist: "Post Malone & Swae Lee", videoId: "ApXoWvfEYVU" },
      { title: "Blinding Lights", artist: "The Weeknd", videoId: "4NRXx6U8ABQ" },
      { title: "Peaches", artist: "Justin Bieber", videoId: "tQ0yjYUFKAE" },
      { title: "drivers license", artist: "Olivia Rodrigo", videoId: "ZmDBbnmKpqQ" },
      { title: "Easy On Me", artist: "Adele", videoId: "U3ASj1L6_sY" },
    ],
    energy: [
      { title: "Uptown Funk", artist: "Bruno Mars", videoId: "OPf0YbXqDm0" },
      { title: "Can't Stop the Feeling", artist: "Justin Timberlake", videoId: "ru0K8uYEZWw" },
      { title: "Shake It Off", artist: "Taylor Swift", videoId: "nfWlot6h_JM" },
      { title: "Happy", artist: "Pharrell Williams", videoId: "ZbZSe6N_BXs" },
      { title: "Dynamite", artist: "BTS", videoId: "gdZLi9oWNZg" },
    ],
    focus: [
      { title: "Experience", artist: "Ludovico Einaudi", videoId: "hN_q-_nGv4U" },
      { title: "River Flows in You", artist: "Yiruma", videoId: "7maJOI3QMu0" },
      { title: "Time", artist: "Hans Zimmer", videoId: "RxabLA7UQ9k" },
      { title: "Comptine d'un autre été", artist: "Yann Tiersen", videoId: "NvryolGa19A" },
      { title: "Interstellar Theme", artist: "Hans Zimmer", videoId: "kpz8lpoLvrA" },
    ],
    happy: [
      { title: "Good as Hell", artist: "Lizzo", videoId: "SmbmeOgWsqE" },
      { title: "Walking on Sunshine", artist: "Katrina & The Waves", videoId: "iPUmE-tne5U" },
      { title: "I Gotta Feeling", artist: "Black Eyed Peas", videoId: "uSD4vsh1zDA" },
      { title: "Best Day of My Life", artist: "American Authors", videoId: "Y66j_BUCBMY" },
      { title: "Celebration", artist: "Kool & The Gang", videoId: "3GwjfUFyY6M" },
    ],
    workout: [
      { title: "Stronger", artist: "Kanye West", videoId: "PsO6ZnUZI0g" },
      { title: "Eye of the Tiger", artist: "Survivor", videoId: "btPJPFnesV4" },
      { title: "Lose Yourself", artist: "Eminem", videoId: "_Yhyp-_hX2s" },
      { title: "Till I Collapse", artist: "Eminem", videoId: "ytQ5CYE1VZw" },
      { title: "Power", artist: "Kanye West", videoId: "L53gjP-TtGE" },
    ],
    sleep: [
      { title: "Weightless", artist: "Marconi Union", videoId: "UfcAVejslrU" },
      { title: "Clair de Lune", artist: "Debussy", videoId: "CvFH_6DNRCY" },
      { title: "Gymnopédie No.1", artist: "Erik Satie", videoId: "S-Xm7s9eGxU" },
      { title: "Nocturne Op.9 No.2", artist: "Chopin", videoId: "9E6b3swbnWg" },
      { title: "Canon in D", artist: "Pachelbel", videoId: "Ptk_1Dc2iPY" },
    ],
  };

  // Extended list of popular songs - rotates based on time seed
  const allPopularSongs = [
    // Group 1 - Current Hits
    { title: "Blinding Lights", artist: "The Weeknd", videoId: "4NRXx6U8ABQ" },
    { title: "Shape of You", artist: "Ed Sheeran", videoId: "JGwWNGJdvx8" },
    { title: "Dance Monkey", artist: "Tones and I", videoId: "q0hyYWKXF0Q" },
    { title: "Someone You Loved", artist: "Lewis Capaldi", videoId: "zABLecsR5UE" },
    { title: "Watermelon Sugar", artist: "Harry Styles", videoId: "E07s5ZYygMg" },
    // Group 2 - Pop Hits
    { title: "Don't Start Now", artist: "Dua Lipa", videoId: "oygrmJFKYZY" },
    { title: "Levitating", artist: "Dua Lipa", videoId: "TUVcZfQe-Kw" },
    { title: "Stay", artist: "The Kid LAROI & Justin Bieber", videoId: "kTJczUoc26U" },
    { title: "Heat Waves", artist: "Glass Animals", videoId: "mRD0-GxqHVo" },
    { title: "As It Was", artist: "Harry Styles", videoId: "H5v3kku4y6Q" },
    // Group 3 - 2023-2024 Hits
    { title: "Anti-Hero", artist: "Taylor Swift", videoId: "b1kbLwvqugk" },
    { title: "Flowers", artist: "Miley Cyrus", videoId: "G7KNmW9a75Y" },
    { title: "Kill Bill", artist: "SZA", videoId: "hTGdWMlPPRc" },
    { title: "Unholy", artist: "Sam Smith & Kim Petras", videoId: "Uq9gPaIzbe8" },
    { title: "Calm Down", artist: "Rema & Selena Gomez", videoId: "CQLsdm1ZYAw" },
    // Group 4 - Classics
    { title: "Bohemian Rhapsody", artist: "Queen", videoId: "fJ9rUzIMcZQ" },
    { title: "Sweet Child O' Mine", artist: "Guns N' Roses", videoId: "1w7OgIMMRc4" },
    { title: "Billie Jean", artist: "Michael Jackson", videoId: "Zi_XLOBDo_Y" },
    { title: "Take On Me", artist: "a-ha", videoId: "djV11Xbc914" },
    { title: "Africa", artist: "Toto", videoId: "FTQbiNvZqaY" },
    // Group 5 - Hip-Hop/R&B
    { title: "God's Plan", artist: "Drake", videoId: "xpVfcZ0ZcFM" },
    { title: "HUMBLE.", artist: "Kendrick Lamar", videoId: "tvTRZJ-4EyI" },
    { title: "Old Town Road", artist: "Lil Nas X", videoId: "w2Ov5jzm3j8" },
    { title: "Sicko Mode", artist: "Travis Scott", videoId: "6ONRf7h3Mdk" },
    { title: "Bad Guy", artist: "Billie Eilish", videoId: "DyDfgMOUjCI" },
    // Group 6 - Latin/International
    { title: "Despacito", artist: "Luis Fonsi ft. Daddy Yankee", videoId: "kJQP7kiw5Fk" },
    { title: "Tití Me Preguntó", artist: "Bad Bunny", videoId: "iaGobs5i1qw" },
    { title: "Dákiti", artist: "Bad Bunny & Jhay Cortez", videoId: "TmKh7lAwnBI" },
    { title: "Butter", artist: "BTS", videoId: "WMweEpGlu_U" },
    { title: "Pink Venom", artist: "BLACKPINK", videoId: "gQlMMD8auMs" },
    // Group 7 - Alternative/Indie
    { title: "Sweater Weather", artist: "The Neighbourhood", videoId: "GCdwKhTtNNw" },
    { title: "Mr. Brightside", artist: "The Killers", videoId: "gGdGFtwCNBE" },
    { title: "Radioactive", artist: "Imagine Dragons", videoId: "ktvTqknDobU" },
    { title: "Stressed Out", artist: "Twenty One Pilots", videoId: "pXRviuL6vMY" },
    { title: "Believer", artist: "Imagine Dragons", videoId: "7wtfhZwyrcc" },
    // Group 8 - Recent Releases
    { title: "Vampire", artist: "Olivia Rodrigo", videoId: "RlPNh_PBZb4" },
    { title: "Cruel Summer", artist: "Taylor Swift", videoId: "ic8j13piAhQ" },
    { title: "Last Night", artist: "Morgan Wallen", videoId: "BnlYN-cFZmg" },
    { title: "Snooze", artist: "SZA", videoId: "LwE6LxqGKmo" },
    { title: "Creepin'", artist: "Metro Boomin, The Weeknd & 21 Savage", videoId: "6FWUjJF1ai0" },
  ];

  if (mood && moodTracks[mood]) {
    const songs = moodTracks[mood];
    return songs.map((song) => ({
      id: `ytm-${song.videoId}`,
      title: song.title,
      artist_id: song.videoId,
      artist_name: song.artist,
      cover_url: `https://i.ytimg.com/vi/${song.videoId}/hqdefault.jpg`,
      duration_ms: 200000,
      videoId: song.videoId,
    }));
  }

  // Use seed to determine which group to prioritize
  const effectiveSeed = seed || Math.floor(Date.now() / (1000 * 60 * 30)); // Changes every 30 mins
  const groupSize = 5;
  const numGroups = Math.ceil(allPopularSongs.length / groupSize);
  const startGroup = effectiveSeed % numGroups;
  
  // Rotate songs based on seed - prioritize different groups at different times
  const rotatedSongs: typeof allPopularSongs = [];
  for (let i = 0; i < numGroups; i++) {
    const groupIndex = (startGroup + i) % numGroups;
    const start = groupIndex * groupSize;
    const end = Math.min(start + groupSize, allPopularSongs.length);
    rotatedSongs.push(...allPopularSongs.slice(start, end));
  }

  return rotatedSongs.map((song) => ({
    id: `ytm-${song.videoId}`,
    title: song.title,
    artist_id: song.videoId,
    artist_name: song.artist,
    cover_url: `https://i.ytimg.com/vi/${song.videoId}/hqdefault.jpg`,
    duration_ms: 200000,
    videoId: song.videoId,
  }));
}

// Get seeded shuffle for consistent but varied results
function seededShuffle<T>(array: T[], seed: number): T[] {
  const result = [...array];
  let m = result.length;
  let s = seed;
  
  while (m) {
    s = (s * 9301 + 49297) % 233280;
    const i = Math.floor((s / 233280) * m--);
    [result[m], result[i]] = [result[i], result[m]];
  }
  
  return result;
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

    const { type, mood, seedArtists, seedGenres, searchTerms, weekSeed, currentTrackId, limit = 20 } = body;

    console.log("Fetching suggestions...", { type, mood, seedArtists, searchTerms });

    let tracks: Track[] = [];
    const hourSeed = Math.floor(Date.now() / (1000 * 60 * 60)); // Changes every hour
    const halfHourSeed = Math.floor(Date.now() / (1000 * 60 * 30)); // Changes every 30 mins

    if (type === "autoplay" && seedArtists?.length > 0) {
      // Autoplay: fetch similar tracks based on current artist
      const queries = [
        `${seedArtists[0]} similar songs`,
        `songs like ${seedArtists[0]}`,
        `${seedArtists[0]} top songs`,
        "popular music 2024",
      ];
      
      const shuffledQueries = seededShuffle(queries, hourSeed);
      const allTracks: Track[] = [];
      
      for (const query of shuffledQueries.slice(0, 3)) {
        const results = await searchInvidious(query);
        allTracks.push(...results);
      }
      
      // Dedupe and filter out current track
      const seen = new Set<string>();
      if (currentTrackId) seen.add(currentTrackId);
      
      tracks = allTracks.filter(t => {
        if (seen.has(t.id)) return false;
        seen.add(t.id);
        return true;
      });
      
      tracks = seededShuffle(tracks, hourSeed).slice(0, limit);
      
      // Add fallback if not enough
      if (tracks.length < 5) {
        const fallback = getFallbackTracks(undefined, halfHourSeed);
        for (const t of fallback) {
          if (!seen.has(t.id)) {
            tracks.push(t);
            if (tracks.length >= limit) break;
          }
        }
      }
    } else if (type === "discover-weekly") {
      // Discover Weekly: personalized weekly playlist
      const weeklySeed = weekSeed || Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
      
      const queries: string[] = [];
      
      // Add user's favorite artists
      if (seedArtists?.length > 0) {
        queries.push(...seedArtists.slice(0, 3).map((a: string) => `${a} best songs`));
        queries.push(...seedArtists.slice(0, 2).map((a: string) => `artists similar to ${a}`));
      }
      
      // Add discovery queries
      queries.push("new music 2024", "trending songs", "best new songs", "viral hits");
      
      const shuffledQueries = seededShuffle(queries, weeklySeed);
      const allTracks: Track[] = [];
      
      for (const query of shuffledQueries.slice(0, 4)) {
        const results = await searchInvidious(query);
        allTracks.push(...results);
      }
      
      // Dedupe and shuffle
      const seen = new Set<string>();
      tracks = allTracks.filter(t => {
        if (seen.has(t.id)) return false;
        seen.add(t.id);
        return true;
      });
      
      tracks = seededShuffle(tracks, weeklySeed).slice(0, limit);
      
      // Add fallback if not enough
      if (tracks.length < limit / 2) {
        const fallback = getFallbackTracks(undefined, weeklySeed);
        for (const t of seededShuffle(fallback, weeklySeed)) {
          if (!seen.has(t.id)) {
            tracks.push(t);
            if (tracks.length >= limit) break;
          }
        }
      }
    } else if (type === "mood" && mood && MOOD_QUERIES[mood]) {
      // Mood-based playlist generation
      const queries = MOOD_QUERIES[mood];
      const shuffledQueries = seededShuffle(queries, hourSeed);
      
      const allTracks: Track[] = [];
      
      // Add seed artist influence if available
      if (seedArtists?.length > 0) {
        const artistQuery = `${seedArtists[0]} ${mood} music`;
        const artistResults = await searchInvidious(artistQuery);
        allTracks.push(...artistResults);
      }
      
      // Search mood-based queries
      for (const query of shuffledQueries.slice(0, 2)) {
        const results = await searchInvidious(query);
        allTracks.push(...results);
      }
      
      // Dedupe and shuffle
      const seen = new Set<string>();
      tracks = allTracks.filter(t => {
        if (seen.has(t.id)) return false;
        seen.add(t.id);
        return true;
      });
      
      tracks = seededShuffle(tracks, hourSeed).slice(0, limit);
      
      // Add fallback if not enough tracks
      if (tracks.length < limit / 2) {
        const fallback = getFallbackTracks(mood, halfHourSeed);
        for (const t of fallback) {
          if (!seen.has(t.id)) {
            tracks.push(t);
            seen.add(t.id);
            if (tracks.length >= limit) break;
          }
        }
      }
    } else if (type === "personalized" && (seedArtists?.length > 0 || seedGenres?.length > 0 || searchTerms?.length > 0)) {
      // Personalized recommendations based on user's listening history
      const queries: string[] = [];
      
      if (seedArtists?.length > 0) {
        queries.push(...seedArtists.slice(0, 2).map((a: string) => `${a} songs`));
      }
      
      if (searchTerms?.length > 0) {
        queries.push(...searchTerms.slice(0, 2).map((t: string) => `${t} music`));
      }
      
      if (seedGenres?.length > 0) {
        queries.push(...seedGenres.slice(0, 2).map((g: string) => `${g} music 2024`));
      }

      // Search for each query and combine results
      const allTracks: Track[] = [];
      const shuffledQueries = seededShuffle(queries, hourSeed);
      
      for (const query of shuffledQueries.slice(0, 3)) {
        const results = await searchInvidious(query);
        allTracks.push(...results);
      }

      // Shuffle and dedupe
      const seen = new Set<string>();
      tracks = allTracks.filter(t => {
        if (seen.has(t.id)) return false;
        seen.add(t.id);
        return true;
      });
      
      tracks = seededShuffle(tracks, hourSeed).slice(0, limit);

      // If not enough personalized results, add some trending/fallback
      if (tracks.length < limit / 2) {
        const trending = await fetchFromInvidious();
        const fallback = trending.length > 0 ? trending : getFallbackTracks(undefined, halfHourSeed);
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
      
      // Use fallback if no results - with rotation based on time
      if (tracks.length === 0) {
        console.log("Invidious failed, using fallback tracks with rotation");
        tracks = getFallbackTracks(undefined, halfHourSeed);
      }
      
      // Shuffle for variety
      tracks = seededShuffle(tracks, halfHourSeed);
    }

    console.log(`Returning ${tracks.length} tracks`);

    return new Response(JSON.stringify({ tracks: tracks.slice(0, limit) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Suggestions error:", error);
    // Return fallback tracks on error - with rotation
    const halfHourSeed = Math.floor(Date.now() / (1000 * 60 * 30));
    return new Response(
      JSON.stringify({ tracks: getFallbackTracks(undefined, halfHourSeed).slice(0, 20) }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});