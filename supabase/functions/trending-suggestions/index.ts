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

// Invidious instances with fast timeout
async function fetchFromInvidious(): Promise<Track[]> {
  const instances = [
    "https://vid.puffyan.us",
    "https://invidious.nerdvpn.de",
    "https://inv.nadeko.net",
    "https://yewtu.be",
    "https://invidious.snopyta.org",
    "https://invidious.privacydev.net",
    "https://invidious.slipfox.xyz",
  ];

  for (const instance of instances) {
    try {
      const response = await fetch(`${instance}/api/v1/trending?type=music&region=US`, {
        headers: { "User-Agent": "Lilo/1.0", "Accept": "application/json" },
        signal: AbortSignal.timeout(4000),
      });

      if (!response.ok) {
        console.log(`Invidious ${instance} returned ${response.status}`);
        continue;
      }

      const data = await response.json();
      const tracks: Track[] = [];

      for (const item of data) {
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
        return tracks.slice(0, 25);
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
    "https://invidious.privacydev.net",
  ];

  for (const instance of instances) {
    try {
      const response = await fetch(
        `${instance}/api/v1/search?q=${encodeURIComponent(query)}&type=video&sort=relevance`,
        {
          headers: { "User-Agent": "Lilo/1.0", "Accept": "application/json" },
          signal: AbortSignal.timeout(4000),
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

      if (tracks.length > 0) return tracks.slice(0, 10);
    } catch (e) {
      console.error(`Search on ${instance} failed:`, e);
    }
  }

  return [];
}

// MASSIVE expanded fallback list - 120+ songs across diverse genres
function getFallbackTracks(mood?: string, seed?: number, offset?: number): Track[] {
  const moodTracks: Record<string, Array<{ title: string; artist: string; videoId: string }>> = {
    chill: [
      { title: "Sunflower", artist: "Post Malone & Swae Lee", videoId: "ApXoWvfEYVU" },
      { title: "Blinding Lights", artist: "The Weeknd", videoId: "4NRXx6U8ABQ" },
      { title: "Peaches", artist: "Justin Bieber", videoId: "tQ0yjYUFKAE" },
      { title: "drivers license", artist: "Olivia Rodrigo", videoId: "ZmDBbnmKpqQ" },
      { title: "Easy On Me", artist: "Adele", videoId: "U3ASj1L6_sY" },
      { title: "Stay With Me", artist: "Sam Smith", videoId: "pB-5XG-DbAA" },
      { title: "Perfect", artist: "Ed Sheeran", videoId: "2Vv-BfVoq4g" },
    ],
    energy: [
      { title: "Uptown Funk", artist: "Bruno Mars", videoId: "OPf0YbXqDm0" },
      { title: "Can't Stop the Feeling", artist: "Justin Timberlake", videoId: "ru0K8uYEZWw" },
      { title: "Shake It Off", artist: "Taylor Swift", videoId: "nfWlot6h_JM" },
      { title: "Happy", artist: "Pharrell Williams", videoId: "ZbZSe6N_BXs" },
      { title: "Dynamite", artist: "BTS", videoId: "gdZLi9oWNZg" },
      { title: "24K Magic", artist: "Bruno Mars", videoId: "UqyT8IEBkvY" },
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

  // MASSIVE list of 120+ songs for variety - organized by genre groups
  const allPopularSongs = [
    // Group 1 - 2024 Hits
    { title: "Espresso", artist: "Sabrina Carpenter", videoId: "eVli-tstM5E" },
    { title: "Beautiful Things", artist: "Benson Boone", videoId: "Oa3yLIk6fzM" },
    { title: "Lose Control", artist: "Teddy Swims", videoId: "x3iOTqWTveI" },
    { title: "Too Sweet", artist: "Hozier", videoId: "fevmlKYHNuM" },
    { title: "A Bar Song (Tipsy)", artist: "Shaboozey", videoId: "DGSaVxCAOSw" },
    // Group 2 - Pop Classics
    { title: "Blinding Lights", artist: "The Weeknd", videoId: "4NRXx6U8ABQ" },
    { title: "Shape of You", artist: "Ed Sheeran", videoId: "JGwWNGJdvx8" },
    { title: "Dance Monkey", artist: "Tones and I", videoId: "q0hyYWKXF0Q" },
    { title: "Someone You Loved", artist: "Lewis Capaldi", videoId: "zABLecsR5UE" },
    { title: "Watermelon Sugar", artist: "Harry Styles", videoId: "E07s5ZYygMg" },
    // Group 3 - Dua Lipa Era
    { title: "Don't Start Now", artist: "Dua Lipa", videoId: "oygrmJFKYZY" },
    { title: "Levitating", artist: "Dua Lipa", videoId: "TUVcZfQe-Kw" },
    { title: "Physical", artist: "Dua Lipa", videoId: "9HDEHj2yzew" },
    { title: "New Rules", artist: "Dua Lipa", videoId: "k2qgadSvNyU" },
    { title: "One Kiss", artist: "Calvin Harris & Dua Lipa", videoId: "DkeiKbqa02g" },
    // Group 4 - Taylor Swift
    { title: "Anti-Hero", artist: "Taylor Swift", videoId: "b1kbLwvqugk" },
    { title: "Cruel Summer", artist: "Taylor Swift", videoId: "ic8j13piAhQ" },
    { title: "Blank Space", artist: "Taylor Swift", videoId: "e-ORhEE9VVg" },
    { title: "Shake It Off", artist: "Taylor Swift", videoId: "nfWlot6h_JM" },
    { title: "Love Story", artist: "Taylor Swift", videoId: "8xg3vE8Ie_E" },
    // Group 5 - Hip-Hop/Rap
    { title: "God's Plan", artist: "Drake", videoId: "xpVfcZ0ZcFM" },
    { title: "HUMBLE.", artist: "Kendrick Lamar", videoId: "tvTRZJ-4EyI" },
    { title: "Old Town Road", artist: "Lil Nas X", videoId: "w2Ov5jzm3j8" },
    { title: "Sicko Mode", artist: "Travis Scott", videoId: "6ONRf7h3Mdk" },
    { title: "Rockstar", artist: "Post Malone", videoId: "UceaB4D0jpo" },
    // Group 6 - R&B/Soul
    { title: "Flowers", artist: "Miley Cyrus", videoId: "G7KNmW9a75Y" },
    { title: "Kill Bill", artist: "SZA", videoId: "hTGdWMlPPRc" },
    { title: "Snooze", artist: "SZA", videoId: "LwE6LxqGKmo" },
    { title: "Good Days", artist: "SZA", videoId: "2p3zZoraK9g" },
    { title: "Kiss Me More", artist: "Doja Cat ft. SZA", videoId: "0EVVKs6DQLo" },
    // Group 7 - Latin/Reggaeton
    { title: "Despacito", artist: "Luis Fonsi ft. Daddy Yankee", videoId: "kJQP7kiw5Fk" },
    { title: "Tití Me Preguntó", artist: "Bad Bunny", videoId: "iaGobs5i1qw" },
    { title: "Dákiti", artist: "Bad Bunny & Jhay Cortez", videoId: "TmKh7lAwnBI" },
    { title: "Me Porto Bonito", artist: "Bad Bunny", videoId: "F79D9P8wVHk" },
    { title: "Calm Down", artist: "Rema & Selena Gomez", videoId: "CQLsdm1ZYAw" },
    // Group 8 - K-Pop
    { title: "Dynamite", artist: "BTS", videoId: "gdZLi9oWNZg" },
    { title: "Butter", artist: "BTS", videoId: "WMweEpGlu_U" },
    { title: "Pink Venom", artist: "BLACKPINK", videoId: "gQlMMD8auMs" },
    { title: "How You Like That", artist: "BLACKPINK", videoId: "ioNng23DkIM" },
    { title: "Super Shy", artist: "NewJeans", videoId: "ArmDp-zijuc" },
    // Group 9 - Rock/Alternative
    { title: "Sweater Weather", artist: "The Neighbourhood", videoId: "GCdwKhTtNNw" },
    { title: "Mr. Brightside", artist: "The Killers", videoId: "gGdGFtwCNBE" },
    { title: "Radioactive", artist: "Imagine Dragons", videoId: "ktvTqknDobU" },
    { title: "Believer", artist: "Imagine Dragons", videoId: "7wtfhZwyrcc" },
    { title: "Thunder", artist: "Imagine Dragons", videoId: "fKopy74weus" },
    // Group 10 - EDM/Electronic
    { title: "Titanium", artist: "David Guetta ft. Sia", videoId: "JRfuAukYTKg" },
    { title: "Lean On", artist: "Major Lazer & DJ Snake", videoId: "YqeW9_5kURI" },
    { title: "Clarity", artist: "Zedd ft. Foxes", videoId: "IxxstCcJlsc" },
    { title: "Faded", artist: "Alan Walker", videoId: "60ItHLz5WEA" },
    { title: "Wake Me Up", artist: "Avicii", videoId: "IcrbM1l_BoI" },
    // Group 11 - 2023 Hits
    { title: "Vampire", artist: "Olivia Rodrigo", videoId: "RlPNh_PBZb4" },
    { title: "Last Night", artist: "Morgan Wallen", videoId: "BnlYN-cFZmg" },
    { title: "Unholy", artist: "Sam Smith & Kim Petras", videoId: "Uq9gPaIzbe8" },
    { title: "Creepin'", artist: "Metro Boomin, The Weeknd & 21 Savage", videoId: "6FWUjJF1ai0" },
    { title: "Boy's a Liar Pt. 2", artist: "PinkPantheress & Ice Spice", videoId: "SMrN5QSz8e0" },
    // Group 12 - Billie Eilish
    { title: "Bad Guy", artist: "Billie Eilish", videoId: "DyDfgMOUjCI" },
    { title: "lovely", artist: "Billie Eilish & Khalid", videoId: "V1Pl8CzNzCw" },
    { title: "Happier Than Ever", artist: "Billie Eilish", videoId: "5GJWxDKyk3A" },
    { title: "Ocean Eyes", artist: "Billie Eilish", videoId: "viimfQi_pUw" },
    { title: "Therefore I Am", artist: "Billie Eilish", videoId: "RUQl6YcMalg" },
    // Group 13 - Bruno Mars
    { title: "Uptown Funk", artist: "Bruno Mars", videoId: "OPf0YbXqDm0" },
    { title: "24K Magic", artist: "Bruno Mars", videoId: "UqyT8IEBkvY" },
    { title: "Just The Way You Are", artist: "Bruno Mars", videoId: "LjhCEhWiKXk" },
    { title: "That's What I Like", artist: "Bruno Mars", videoId: "PMivT7MJ41M" },
    { title: "Leave The Door Open", artist: "Silk Sonic", videoId: "adLGHcj_fmA" },
    // Group 14 - Classics
    { title: "Bohemian Rhapsody", artist: "Queen", videoId: "fJ9rUzIMcZQ" },
    { title: "Sweet Child O' Mine", artist: "Guns N' Roses", videoId: "1w7OgIMMRc4" },
    { title: "Billie Jean", artist: "Michael Jackson", videoId: "Zi_XLOBDo_Y" },
    { title: "Take On Me", artist: "a-ha", videoId: "djV11Xbc914" },
    { title: "Africa", artist: "Toto", videoId: "FTQbiNvZqaY" },
    // Group 15 - Ariana Grande
    { title: "7 rings", artist: "Ariana Grande", videoId: "QYh6mYIJG2Y" },
    { title: "thank u, next", artist: "Ariana Grande", videoId: "gl1aHhXnN1k" },
    { title: "positions", artist: "Ariana Grande", videoId: "tcYodQoapMg" },
    { title: "Into You", artist: "Ariana Grande", videoId: "1ekZEVeXwek" },
    { title: "No Tears Left To Cry", artist: "Ariana Grande", videoId: "ffxKSjUwKdU" },
    // Group 16 - The Weeknd
    { title: "Starboy", artist: "The Weeknd", videoId: "34Na4j8AVgA" },
    { title: "Save Your Tears", artist: "The Weeknd", videoId: "XXYlFuWEuKI" },
    { title: "Die For You", artist: "The Weeknd", videoId: "mTLQhPFx2nM" },
    { title: "Can't Feel My Face", artist: "The Weeknd", videoId: "KEI4qSrkPAs" },
    { title: "The Hills", artist: "The Weeknd", videoId: "yzTuBuRdAyA" },
    // Group 17 - Justin Bieber
    { title: "Stay", artist: "The Kid LAROI & Justin Bieber", videoId: "kTJczUoc26U" },
    { title: "Peaches", artist: "Justin Bieber", videoId: "tQ0yjYUFKAE" },
    { title: "Sorry", artist: "Justin Bieber", videoId: "fRh_vgS2dFE" },
    { title: "Love Yourself", artist: "Justin Bieber", videoId: "oyEuk8j8imI" },
    { title: "What Do You Mean?", artist: "Justin Bieber", videoId: "DK_0jXPuIr0" },
    // Group 18 - Harry Styles
    { title: "As It Was", artist: "Harry Styles", videoId: "H5v3kku4y6Q" },
    { title: "Watermelon Sugar", artist: "Harry Styles", videoId: "E07s5ZYygMg" },
    { title: "Sign of the Times", artist: "Harry Styles", videoId: "qN4ooNx77u0" },
    { title: "Late Night Talking", artist: "Harry Styles", videoId: "jjt9Av7GIPY" },
    { title: "Adore You", artist: "Harry Styles", videoId: "VF-r5TtlT9w" },
    // Group 19 - Post Malone
    { title: "Sunflower", artist: "Post Malone & Swae Lee", videoId: "ApXoWvfEYVU" },
    { title: "Circles", artist: "Post Malone", videoId: "wXhTHyIgQ_U" },
    { title: "Congratulations", artist: "Post Malone", videoId: "SC4xMk98Pdc" },
    { title: "Better Now", artist: "Post Malone", videoId: "UYwF-jdcVjY" },
    { title: "I Like You", artist: "Post Malone & Doja Cat", videoId: "cksrPF3PQFQ" },
    // Group 20 - Doja Cat
    { title: "Say So", artist: "Doja Cat", videoId: "pok8H_KF1FA" },
    { title: "Woman", artist: "Doja Cat", videoId: "MNSjHt3Hb-4" },
    { title: "Need to Know", artist: "Doja Cat", videoId: "L3yEnGNt5QA" },
    { title: "Streets", artist: "Doja Cat", videoId: "r4RKfODj-LQ" },
    { title: "Get Into It (Yuh)", artist: "Doja Cat", videoId: "VPFb1XmmLsE" },
    // Group 21 - Olivia Rodrigo
    { title: "drivers license", artist: "Olivia Rodrigo", videoId: "ZmDBbnmKpqQ" },
    { title: "good 4 u", artist: "Olivia Rodrigo", videoId: "gNi_6U5Pm_o" },
    { title: "deja vu", artist: "Olivia Rodrigo", videoId: "cii6ruuycQA" },
    { title: "traitor", artist: "Olivia Rodrigo", videoId: "5GDIe1nQa30" },
    { title: "brutal", artist: "Olivia Rodrigo", videoId: "gMorPVFKqvQ" },
    // Group 22 - Drake
    { title: "One Dance", artist: "Drake", videoId: "qL7zrWKBTwY" },
    { title: "Hotline Bling", artist: "Drake", videoId: "uxpDa-c-4Mc" },
    { title: "In My Feelings", artist: "Drake", videoId: "DRS_PpOrUZ4" },
    { title: "Nice For What", artist: "Drake", videoId: "U9BwWKXjVaI" },
    { title: "Started From the Bottom", artist: "Drake", videoId: "RubBzkZzpUA" },
    // Group 23 - Indie/Alternative
    { title: "Heat Waves", artist: "Glass Animals", videoId: "mRD0-GxqHVo" },
    { title: "Take Me To Church", artist: "Hozier", videoId: "PVjiKRfKpPI" },
    { title: "Stressed Out", artist: "Twenty One Pilots", videoId: "pXRviuL6vMY" },
    { title: "Heathens", artist: "Twenty One Pilots", videoId: "UprcpdwuwCg" },
    { title: "Pumped Up Kicks", artist: "Foster The People", videoId: "SDTZ7iX4vTQ" },
    // Group 24 - Recent Viral
    { title: "Makeba", artist: "Jain", videoId: "59Q_lhgGANc" },
    { title: "Until I Found You", artist: "Stephen Sanchez", videoId: "GxldQ9eX2wo" },
    { title: "Daylight", artist: "David Kushner", videoId: "lYdLVgJ3TPI" },
    { title: "Ghost", artist: "Justin Bieber", videoId: "Fp8msa5uYsc" },
    { title: "abcdefu", artist: "GAYLE", videoId: "NaFd8ucHLuo" },
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

  // Use seed + offset to get different songs for different sections
  const effectiveSeed = (seed || Math.floor(Date.now() / (1000 * 60 * 15))) + (offset || 0);
  const groupSize = 5;
  const numGroups = Math.ceil(allPopularSongs.length / groupSize);
  const startGroup = effectiveSeed % numGroups;

  // Rotate songs based on seed
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
      // No body
    }

    const { type, mood, seedArtists, seedGenres, searchTerms, weekSeed, currentTrackId, sectionOffset = 0, limit = 20 } = body;

    console.log("Fetching suggestions...", { type, mood, seedArtists, sectionOffset });

    let tracks: Track[] = [];
    
    // Different time seeds for variety - each section can use different offset
    const now = Date.now();
    const seed15min = Math.floor(now / (1000 * 60 * 15));
    const seed20min = Math.floor(now / (1000 * 60 * 20));
    const seed25min = Math.floor(now / (1000 * 60 * 25));

    if (type === "autoplay" && seedArtists?.length > 0) {
      const queries = [
        `${seedArtists[0]} similar songs`,
        `songs like ${seedArtists[0]}`,
        `${seedArtists[0]} top songs`,
        "popular music 2024",
      ];

      const shuffledQueries = seededShuffle(queries, seed20min);
      const allTracks: Track[] = [];

      for (const query of shuffledQueries.slice(0, 3)) {
        const results = await searchInvidious(query);
        allTracks.push(...results);
      }

      const seen = new Set<string>();
      if (currentTrackId) seen.add(currentTrackId);

      tracks = allTracks.filter((t) => {
        if (seen.has(t.id)) return false;
        seen.add(t.id);
        return true;
      });

      tracks = seededShuffle(tracks, seed20min).slice(0, limit);

      if (tracks.length < 5) {
        const fallback = getFallbackTracks(undefined, seed20min, sectionOffset);
        for (const t of fallback) {
          if (!seen.has(t.id)) {
            tracks.push(t);
            if (tracks.length >= limit) break;
          }
        }
      }
    } else if (type === "discover-weekly") {
      const weeklySeed = weekSeed || Math.floor(now / (7 * 24 * 60 * 60 * 1000));

      const queries: string[] = [];
      if (seedArtists?.length > 0) {
        queries.push(...seedArtists.slice(0, 3).map((a: string) => `${a} best songs`));
        queries.push(...seedArtists.slice(0, 2).map((a: string) => `artists similar to ${a}`));
      }
      queries.push("new music 2024", "trending songs", "best new songs", "viral hits");

      const shuffledQueries = seededShuffle(queries, weeklySeed);
      const allTracks: Track[] = [];

      for (const query of shuffledQueries.slice(0, 4)) {
        const results = await searchInvidious(query);
        allTracks.push(...results);
      }

      const seen = new Set<string>();
      tracks = allTracks.filter((t) => {
        if (seen.has(t.id)) return false;
        seen.add(t.id);
        return true;
      });

      tracks = seededShuffle(tracks, weeklySeed).slice(0, limit);

      if (tracks.length < limit / 2) {
        const fallback = getFallbackTracks(undefined, weeklySeed, 7);
        for (const t of seededShuffle(fallback, weeklySeed)) {
          if (!seen.has(t.id)) {
            tracks.push(t);
            if (tracks.length >= limit) break;
          }
        }
      }
    } else if (type === "mood" && mood && MOOD_QUERIES[mood]) {
      const queries = MOOD_QUERIES[mood];
      const shuffledQueries = seededShuffle(queries, seed15min);

      const allTracks: Track[] = [];

      if (seedArtists?.length > 0) {
        const artistQuery = `${seedArtists[0]} ${mood} music`;
        const artistResults = await searchInvidious(artistQuery);
        allTracks.push(...artistResults);
      }

      for (const query of shuffledQueries.slice(0, 2)) {
        const results = await searchInvidious(query);
        allTracks.push(...results);
      }

      const seen = new Set<string>();
      tracks = allTracks.filter((t) => {
        if (seen.has(t.id)) return false;
        seen.add(t.id);
        return true;
      });

      tracks = seededShuffle(tracks, seed15min).slice(0, limit);

      if (tracks.length < limit / 2) {
        const fallback = getFallbackTracks(mood, seed15min);
        for (const t of fallback) {
          if (!seen.has(t.id)) {
            tracks.push(t);
            seen.add(t.id);
            if (tracks.length >= limit) break;
          }
        }
      }
    } else if (type === "personalized" && (seedArtists?.length > 0 || seedGenres?.length > 0 || searchTerms?.length > 0)) {
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

      const shuffledQueries = seededShuffle(queries, seed25min + sectionOffset);
      const allTracks: Track[] = [];

      for (const query of shuffledQueries.slice(0, 3)) {
        const results = await searchInvidious(query);
        allTracks.push(...results);
      }

      const seen = new Set<string>();
      tracks = allTracks.filter((t) => {
        if (seen.has(t.id)) return false;
        seen.add(t.id);
        return true;
      });

      tracks = seededShuffle(tracks, seed25min + sectionOffset).slice(0, limit);

      if (tracks.length < limit / 2) {
        const trending = await fetchFromInvidious();
        const fallback = trending.length > 0 ? trending : getFallbackTracks(undefined, seed25min, sectionOffset);
        for (const t of fallback) {
          if (!seen.has(t.id)) {
            tracks.push(t);
            if (tracks.length >= limit) break;
          }
        }
      }
    } else {
      // Default: fetch trending with offset for variety
      tracks = await fetchFromInvidious();

      if (tracks.length === 0) {
        console.log("Invidious failed, using fallback tracks with rotation");
        tracks = getFallbackTracks(undefined, seed15min, sectionOffset);
      }

      tracks = seededShuffle(tracks, seed15min + sectionOffset);
    }

    console.log(`Returning ${tracks.length} tracks`);

    return new Response(JSON.stringify({ tracks: tracks.slice(0, limit) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Suggestions error:", error);
    const seed15min = Math.floor(Date.now() / (1000 * 60 * 15));
    return new Response(
      JSON.stringify({ tracks: getFallbackTracks(undefined, seed15min).slice(0, 20) }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
