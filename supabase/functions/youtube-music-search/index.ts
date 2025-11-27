import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// YouTube Music API unofficial endpoint
const YTMUSIC_API_URL = "https://music.youtube.com/youtubei/v1/search";

interface YTMusicTrack {
  videoId: string;
  title: string;
  artists: { name: string }[];
  album?: { name: string };
  thumbnail: string;
  duration?: number;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();

    if (!query || typeof query !== "string") {
      return new Response(
        JSON.stringify({ error: "Query parameter is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use YouTube's internal API (similar to ytmusic-api approach)
    const response = await fetch(`${YTMUSIC_API_URL}?key=AIzaSyC9XL3ZjWddXya6X74dJoCTL-WEYFDNX30`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://music.youtube.com/",
        "Origin": "https://music.youtube.com",
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

    if (!response.ok) {
      throw new Error(`YouTube Music API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Parse the response to extract tracks
    const tracks: YTMusicTrack[] = [];
    
    try {
      const contents = data?.contents?.tabbedSearchResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents || [];
      
      for (const section of contents) {
        const items = section?.musicShelfRenderer?.contents || [];
        
        for (const item of items) {
          const flexColumns = item?.musicResponsiveListItemRenderer?.flexColumns || [];
          const overlay = item?.musicResponsiveListItemRenderer?.overlay;
          
          // Get video ID
          const videoId = overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer?.playNavigationEndpoint?.watchEndpoint?.videoId;
          
          if (!videoId) continue;
          
          // Get title
          const title = flexColumns[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text;
          
          // Get artist
          const artistRuns = flexColumns[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || [];
          const artistName = artistRuns.find((r: any) => r.navigationEndpoint?.browseEndpoint?.browseEndpointContextSupportedConfigs?.browseEndpointContextMusicConfig?.pageType === "MUSIC_PAGE_TYPE_ARTIST")?.text || artistRuns[0]?.text || "Unknown Artist";
          
          // Get album
          const albumName = artistRuns.find((r: any) => r.navigationEndpoint?.browseEndpoint?.browseEndpointContextSupportedConfigs?.browseEndpointContextMusicConfig?.pageType === "MUSIC_PAGE_TYPE_ALBUM")?.text;
          
          // Get thumbnail
          const thumbnails = item?.musicResponsiveListItemRenderer?.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails || [];
          const thumbnail = thumbnails[thumbnails.length - 1]?.url || "";
          
          // Get duration
          const durationText = flexColumns[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.find((r: any) => r.text?.match(/^\d+:\d+$/))?.text;
          let duration = 0;
          if (durationText) {
            const parts = durationText.split(":").map(Number);
            duration = parts[0] * 60000 + parts[1] * 1000;
          }
          
          if (title) {
            tracks.push({
              videoId,
              title,
              artists: [{ name: artistName }],
              album: albumName ? { name: albumName } : undefined,
              thumbnail: thumbnail.replace(/w\d+-h\d+/, "w400-h400"),
              duration,
            });
          }
        }
      }
    } catch (parseError) {
      console.error("Parse error:", parseError);
    }

    return new Response(
      JSON.stringify({ tracks: tracks.slice(0, 20) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message, tracks: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
