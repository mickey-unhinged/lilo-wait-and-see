import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// YouTube Music internal API endpoint
const YT_MUSIC_API = "https://music.youtube.com/youtubei/v1";

interface Track {
  id: string;
  title: string;
  artist_id: string;
  artist_name: string;
  cover_url: string;
  duration_ms: number;
  videoId: string;
}

async function fetchTrendingFromYouTubeMusic(): Promise<Track[]> {
  try {
    const response = await fetch(`${YT_MUSIC_API}/browse?key=AIzaSyC9XL3ZjWddXya6X74dJoCTL-WEYFDNX30`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Origin": "https://music.youtube.com",
        "Referer": "https://music.youtube.com/",
      },
      body: JSON.stringify({
        context: {
          client: {
            clientName: "WEB_REMIX",
            clientVersion: "1.20231204.01.00",
            hl: "en",
            gl: "US",
          },
        },
        browseId: "FEmusic_charts",
      }),
    });

    if (!response.ok) {
      console.error("YouTube Music API returned:", response.status);
      return [];
    }

    const data = await response.json();
    const tracks: Track[] = [];

    // Parse the response to extract trending tracks
    const contents = data?.contents?.singleColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents;
    
    if (contents) {
      for (const section of contents) {
        const musicCarousel = section?.musicCarouselShelfRenderer;
        if (musicCarousel?.contents) {
          for (const item of musicCarousel.contents) {
            const musicTwoRowItem = item?.musicTwoRowItemRenderer || item?.musicResponsiveListItemRenderer;
            if (musicTwoRowItem) {
              try {
                const title = musicTwoRowItem.title?.runs?.[0]?.text || 
                             musicTwoRowItem.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text;
                const artist = musicTwoRowItem.subtitle?.runs?.[0]?.text ||
                              musicTwoRowItem.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text;
                const thumbnail = musicTwoRowItem.thumbnailRenderer?.musicThumbnailRenderer?.thumbnail?.thumbnails?.slice(-1)?.[0]?.url ||
                                  musicTwoRowItem.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails?.slice(-1)?.[0]?.url;
                const videoId = musicTwoRowItem.navigationEndpoint?.watchEndpoint?.videoId ||
                               musicTwoRowItem.overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer?.playNavigationEndpoint?.watchEndpoint?.videoId;

                if (title && artist && videoId) {
                  tracks.push({
                    id: videoId,
                    title,
                    artist_id: videoId,
                    artist_name: artist,
                    cover_url: thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
                    duration_ms: 180000,
                    videoId,
                  });
                }
              } catch (e) {
                // Skip malformed items
              }
            }
          }
        }
      }
    }

    return tracks.slice(0, 20);
  } catch (error) {
    console.error("Failed to fetch from YouTube Music:", error);
    return [];
  }
}

// Search for tracks based on artist or genre
async function searchYouTubeMusic(query: string): Promise<Track[]> {
  try {
    const response = await fetch(`${YT_MUSIC_API}/search?key=AIzaSyC9XL3ZjWddXya6X74dJoCTL-WEYFDNX30`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Origin": "https://music.youtube.com",
        "Referer": "https://music.youtube.com/",
      },
      body: JSON.stringify({
        context: {
          client: {
            clientName: "WEB_REMIX",
            clientVersion: "1.20231204.01.00",
            hl: "en",
            gl: "US",
          },
        },
        query: query,
        params: "EgWKAQIIAWoKEAMQBBAJEAoQBQ%3D%3D", // Filter for songs
      }),
    });

    if (!response.ok) return [];

    const data = await response.json();
    const tracks: Track[] = [];

    const contents = data?.contents?.tabbedSearchResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents;
    
    if (contents) {
      for (const section of contents) {
        const musicShelf = section?.musicShelfRenderer;
        if (musicShelf?.contents) {
          for (const item of musicShelf.contents) {
            const flexColumns = item?.musicResponsiveListItemRenderer?.flexColumns;
            if (flexColumns) {
              try {
                const title = flexColumns[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text;
                const artist = flexColumns[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text;
                const videoId = item?.musicResponsiveListItemRenderer?.overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer?.playNavigationEndpoint?.watchEndpoint?.videoId;
                const thumbnail = item?.musicResponsiveListItemRenderer?.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails?.slice(-1)?.[0]?.url;

                if (title && artist && videoId) {
                  tracks.push({
                    id: videoId,
                    title,
                    artist_id: videoId,
                    artist_name: artist,
                    cover_url: thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
                    duration_ms: 180000,
                    videoId,
                  });
                }
              } catch (e) {
                // Skip malformed items
              }
            }
          }
        }
      }
    }

    return tracks.slice(0, 10);
  } catch (error) {
    console.error("Failed to search YouTube Music:", error);
    return [];
  }
}

// Fallback: fetch popular music from Piped API
async function fetchFromPiped(): Promise<Track[]> {
  const instances = [
    "https://pipedapi.kavin.rocks",
    "https://piped-api.garudalinux.org",
  ];

  for (const instance of instances) {
    try {
      const response = await fetch(`${instance}/trending?region=US`, {
        headers: { "User-Agent": "Lilo/1.0" },
      });

      if (!response.ok) continue;

      const data = await response.json();
      const tracks: Track[] = [];

      for (const item of data) {
        if (item.type === "stream" && item.duration && item.duration < 600) {
          tracks.push({
            id: item.url?.replace("/watch?v=", "") || item.id,
            title: item.title,
            artist_id: item.uploaderUrl?.replace("/channel/", "") || "unknown",
            artist_name: item.uploaderName || "Unknown Artist",
            cover_url: item.thumbnail || `https://i.ytimg.com/vi/${item.url?.replace("/watch?v=", "")}/hqdefault.jpg`,
            duration_ms: (item.duration || 180) * 1000,
            videoId: item.url?.replace("/watch?v=", "") || item.id,
          });
        }
      }

      if (tracks.length > 0) {
        return tracks.slice(0, 20);
      }
    } catch (e) {
      console.error(`Piped instance ${instance} failed:`, e);
    }
  }

  return [];
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
        const results = await searchYouTubeMusic(query);
        allTracks.push(...results);
      }

      // Shuffle and dedupe
      const seen = new Set<string>();
      tracks = allTracks.filter(t => {
        if (seen.has(t.id)) return false;
        seen.add(t.id);
        return true;
      }).sort(() => Math.random() - 0.5).slice(0, limit);

      // If not enough personalized results, add some trending
      if (tracks.length < limit / 2) {
        const trending = await fetchTrendingFromYouTubeMusic();
        for (const t of trending) {
          if (!seen.has(t.id)) {
            tracks.push(t);
            if (tracks.length >= limit) break;
          }
        }
      }
    } else {
      // Default: fetch trending
      tracks = await fetchTrendingFromYouTubeMusic();
      
      if (tracks.length === 0) {
        console.log("YouTube Music failed, trying Piped...");
        tracks = await fetchFromPiped();
      }
    }

    console.log(`Found ${tracks.length} tracks`);

    return new Response(JSON.stringify({ tracks: tracks.slice(0, limit) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Suggestions error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch suggestions", tracks: [] }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
