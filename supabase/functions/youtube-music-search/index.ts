import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Piped instances for search
const PIPED_INSTANCES = [
  "https://pipedapi.kavin.rocks",
  "https://pipedapi.adminforge.de",
  "https://api.piped.privacydev.net",
];

interface PipedSearchResult {
  url: string;
  title: string;
  thumbnail: string;
  uploaderName: string;
  uploaderUrl: string;
  duration: number;
  views: number;
  type: string;
}

serve(async (req) => {
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

    console.log(`Searching for: ${query}`);

    // Try Piped instances for search
    for (const instance of PIPED_INSTANCES) {
      try {
        console.log(`Trying search on: ${instance}`);
        
        const response = await fetch(
          `${instance}/search?q=${encodeURIComponent(query)}&filter=music_songs`,
          {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            },
          }
        );

        if (!response.ok) {
          console.log(`Instance ${instance} returned ${response.status}`);
          continue;
        }

        const data = await response.json();
        const items: PipedSearchResult[] = data.items || [];

        // Filter for video/music results and map to our format
        const tracks = items
          .filter((item) => item.type === "stream" && item.url)
          .slice(0, 20)
          .map((item) => {
            // Extract video ID from URL like /watch?v=VIDEO_ID
            const videoIdMatch = item.url.match(/[?&]v=([^&]+)/);
            const videoId = videoIdMatch ? videoIdMatch[1] : item.url.replace("/watch?v=", "");

            return {
              videoId,
              title: item.title,
              artists: [{ name: item.uploaderName || "Unknown Artist" }],
              album: undefined,
              thumbnail: item.thumbnail || "",
              duration: (item.duration || 0) * 1000,
            };
          });

        if (tracks.length > 0) {
          console.log(`Found ${tracks.length} tracks from ${instance}`);
          return new Response(
            JSON.stringify({ tracks }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

      } catch (instanceError) {
        console.error(`Error with instance ${instance}:`, instanceError);
        continue;
      }
    }

    // Fallback: Try YouTube Music internal API
    try {
      console.log("Trying YouTube Music internal API as fallback");
      
      const ytResponse = await fetch(
        "https://music.youtube.com/youtubei/v1/search?key=AIzaSyC9XL3ZjWddXya6X74dJoCTL-WEYFDNX30",
        {
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
            params: "EgWKAQIIAWoKEAMQBBAJEAoQBQ%3D%3D",
          }),
        }
      );

      if (ytResponse.ok) {
        const ytData = await ytResponse.json();
        const tracks: any[] = [];

        const contents = ytData?.contents?.tabbedSearchResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents || [];

        for (const section of contents) {
          const items = section?.musicShelfRenderer?.contents || [];

          for (const item of items) {
            const flexColumns = item?.musicResponsiveListItemRenderer?.flexColumns || [];
            const overlay = item?.musicResponsiveListItemRenderer?.overlay;

            const videoId = overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer?.playNavigationEndpoint?.watchEndpoint?.videoId;

            if (!videoId) continue;

            const title = flexColumns[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text;
            const artistRuns = flexColumns[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || [];
            const artistName = artistRuns[0]?.text || "Unknown Artist";
            const thumbnails = item?.musicResponsiveListItemRenderer?.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails || [];
            const thumbnail = thumbnails[thumbnails.length - 1]?.url || "";

            if (title) {
              tracks.push({
                videoId,
                title,
                artists: [{ name: artistName }],
                thumbnail: thumbnail.replace(/w\d+-h\d+/, "w400-h400"),
                duration: 0,
              });
            }
          }
        }

        if (tracks.length > 0) {
          console.log(`Found ${tracks.length} tracks from YouTube Music API`);
          return new Response(
            JSON.stringify({ tracks: tracks.slice(0, 20) }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    } catch (ytError) {
      console.error("YouTube Music API fallback error:", ytError);
    }

    // No results found
    return new Response(
      JSON.stringify({ tracks: [], message: "No results found" }),
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
