import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// List of Piped instances to try (open-source YouTube frontends)
const PIPED_INSTANCES = [
  "https://pipedapi.kavin.rocks",
  "https://pipedapi.adminforge.de",
  "https://api.piped.privacydev.net",
  "https://pipedapi.in.projectsegfau.lt",
];

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

    console.log(`Fetching audio for videoId: ${videoId}`);

    // Try multiple Piped instances
    for (const instance of PIPED_INSTANCES) {
      try {
        console.log(`Trying instance: ${instance}`);
        
        const response = await fetch(`${instance}/streams/${videoId}`, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
        });

        if (!response.ok) {
          console.log(`Instance ${instance} returned ${response.status}`);
          continue;
        }

        const data = await response.json();
        
        // Get audio streams
        const audioStreams = data.audioStreams || [];
        
        // Sort by bitrate and get the best quality
        const bestAudio = audioStreams
          .filter((s: any) => s.url && s.mimeType?.startsWith("audio/"))
          .sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0))[0];

        if (bestAudio?.url) {
          console.log(`Found audio stream from ${instance}`);
          return new Response(
            JSON.stringify({
              audioUrl: bestAudio.url,
              duration: (data.duration || 0) * 1000,
              title: data.title,
              quality: bestAudio.quality || "audio",
              bitrate: bestAudio.bitrate,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Fallback to video stream if no audio-only stream
        const videoStreams = data.videoStreams || [];
        const videoWithAudio = videoStreams
          .filter((s: any) => s.url && s.videoOnly === false)
          .sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0))[0];

        if (videoWithAudio?.url) {
          console.log(`Found video+audio stream from ${instance}`);
          return new Response(
            JSON.stringify({
              audioUrl: videoWithAudio.url,
              duration: (data.duration || 0) * 1000,
              title: data.title,
              quality: videoWithAudio.quality || "video",
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Try HLS stream as last resort
        if (data.hls) {
          console.log(`Found HLS stream from ${instance}`);
          return new Response(
            JSON.stringify({
              audioUrl: data.hls,
              duration: (data.duration || 0) * 1000,
              title: data.title,
              quality: "hls",
              isHls: true,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

      } catch (instanceError) {
        console.error(`Error with instance ${instance}:`, instanceError);
        continue;
      }
    }

    // All instances failed
    return new Response(
      JSON.stringify({ 
        error: "Could not fetch audio stream from any source",
        videoId 
      }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
