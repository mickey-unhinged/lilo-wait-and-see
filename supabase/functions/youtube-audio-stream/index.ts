import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { videoId } = await req.json();

    if (!videoId) {
      return new Response(
        JSON.stringify({ error: "videoId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get video info using YouTube's player API
    const playerResponse = await fetch(
      `https://www.youtube.com/youtubei/v1/player?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "com.google.android.youtube/17.36.4 (Linux; U; Android 12; GB) gzip",
        },
        body: JSON.stringify({
          videoId: videoId,
          context: {
            client: {
              clientName: "ANDROID_MUSIC",
              clientVersion: "5.16.51",
              androidSdkVersion: 30,
              hl: "en",
              gl: "US",
            },
          },
        }),
      }
    );

    const playerData = await playerResponse.json();

    // Extract audio stream URL
    const formats = playerData?.streamingData?.adaptiveFormats || [];
    
    // Find the best audio-only format
    const audioFormat = formats
      .filter((f: any) => f.mimeType?.startsWith("audio/"))
      .sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0))[0];

    if (!audioFormat?.url) {
      // Try combined formats as fallback
      const combinedFormats = playerData?.streamingData?.formats || [];
      const fallbackFormat = combinedFormats.sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0))[0];
      
      if (fallbackFormat?.url) {
        return new Response(
          JSON.stringify({ 
            audioUrl: fallbackFormat.url,
            duration: parseInt(playerData?.videoDetails?.lengthSeconds || "0") * 1000,
            title: playerData?.videoDetails?.title,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "No audio stream available", details: playerData?.playabilityStatus }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ 
        audioUrl: audioFormat.url,
        duration: parseInt(playerData?.videoDetails?.lengthSeconds || "0") * 1000,
        title: playerData?.videoDetails?.title,
        quality: audioFormat.audioQuality,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
