// Edge Function: AI Image Generation
// Proxies FLUX.1-Kontext-dev image generation calls
// Deploy: supabase functions deploy ai-image
// Secrets: supabase secrets set DEEPINFRA_KEY=your-key

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DEEPINFRA_BASE = "https://api.deepinfra.com/v1/openai";

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

    const deepInfraKey = Deno.env.get("DEEPINFRA_KEY");
    if (!deepInfraKey) {
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request body which contains prompt, imageBase64, model, size
    const { prompt, imageBase64, model, size } = await req.json();

    const formData = new FormData();
    formData.append("model", model || "black-forest-labs/FLUX.1-Kontext-dev");
    formData.append("prompt", prompt);
    formData.append("n", "1");
    formData.append("size", size || "768x1024");

    // Convert base64 to blob for the image
    const imageBytes = Uint8Array.from(atob(imageBase64), (c) => c.charCodeAt(0));
    const imageBlob = new Blob([imageBytes], { type: "image/jpeg" });
    formData.append("image", imageBlob, "image.jpg");

    const response = await fetch(`${DEEPINFRA_BASE}/images/edits`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${deepInfraKey}`,
      },
      body: formData,
    });

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
