// Edge Function: Background Removal
// Proxies remove.bg API calls
// Deploy: supabase functions deploy remove-bg
// Secrets: supabase secrets set REMOVEBG_API_KEY=your-key

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode } from "https://deno.land/std@0.177.0/encoding/base64.ts";

const REMOVEBG_API_URL = "https://api.remove.bg/v1.0/removebg";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const removeBgKey = Deno.env.get("REMOVEBG_API_KEY");
    if (!removeBgKey) {
      return new Response(JSON.stringify({ error: "Background removal not configured" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { imageBase64 } = await req.json();

    const formData = new FormData();
    formData.append("image_file_b64", imageBase64);
    formData.append("size", "auto");
    formData.append("format", "png");

    const response = await fetch(REMOVEBG_API_URL, {
      method: "POST",
      headers: {
        "X-Api-Key": removeBgKey,
      },
      body: formData,
    });

    if (!response.ok) {
      const errText = await response.text();
      return new Response(JSON.stringify({ error: `remove.bg error: ${response.status}`, details: errText }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resultBuffer = await response.arrayBuffer();
    const resultBase64 = encode(new Uint8Array(resultBuffer));

    return new Response(JSON.stringify({ imageBase64: resultBase64 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
