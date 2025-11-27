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
    const { title, artist } = await req.json();

    if (!title || !artist) {
      return new Response(
        JSON.stringify({ error: "Title and artist are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Searching lyrics for: ${title} by ${artist}`);

    // Try LRCLIB first (better for synced lyrics)
    try {
      const lrclibResponse = await fetch(
        `https://lrclib.net/api/search?track_name=${encodeURIComponent(title)}&artist_name=${encodeURIComponent(artist)}`,
        { headers: { "User-Agent": "Lilo Music App" } }
      );

      if (lrclibResponse.ok) {
        const results = await lrclibResponse.json();
        if (results && results.length > 0) {
          const bestMatch = results[0];
          return new Response(
            JSON.stringify({
              lyrics: bestMatch.plainLyrics || bestMatch.syncedLyrics,
              syncedLyrics: bestMatch.syncedLyrics,
              source: "lrclib",
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    } catch (lrclibError) {
      console.error("LRCLIB error:", lrclibError);
    }

    // Fallback to lyrics.ovh
    try {
      const ovhResponse = await fetch(
        `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`
      );

      if (ovhResponse.ok) {
        const data = await ovhResponse.json();
        if (data.lyrics) {
          return new Response(
            JSON.stringify({
              lyrics: data.lyrics,
              syncedLyrics: null,
              source: "lyrics.ovh",
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    } catch (ovhError) {
      console.error("lyrics.ovh error:", ovhError);
    }

    return new Response(
      JSON.stringify({ lyrics: null, error: "Lyrics not found" }),
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
