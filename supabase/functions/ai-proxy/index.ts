// Edge Function: AI Proxy
// Routes client requests to: Google Vision, Replicate, DeepInfra Image
// Deploy: supabase functions deploy ai-proxy
// Secrets: supabase secrets set GOOGLE_VISION_KEY=... REPLICATE_API_TOKEN=... DEEPINFRA_KEY=...

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function verifyAuth(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) throw new Error("No authorization header");

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const {
    data: { user },
    error,
  } = await supabaseClient.auth.getUser();
  if (error || !user) throw new Error("Unauthorized");
  return user;
}

async function handleGoogleVision(body: Record<string, unknown>) {
  const key = Deno.env.get("GOOGLE_VISION_KEY");
  if (!key) throw new Error("Google Vision not configured");

  const response = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Google Vision error (${response.status}): ${errText}`);
  }

  return response.json();
}

async function handleReplicate(body: {
  model: string;
  input: Record<string, unknown>;
}) {
  const token = Deno.env.get("REPLICATE_API_TOKEN");
  if (!token) throw new Error("Replicate not configured");

  const isVersion = !body.model.includes("/");
  const url = isVersion
    ? "https://api.replicate.com/v1/predictions"
    : `https://api.replicate.com/v1/models/${body.model}/predictions`;

  const reqBody: Record<string, unknown> = { input: body.input };
  if (isVersion) reqBody.version = body.model;

  let prediction: Record<string, unknown>;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Prefer: "wait",
      },
      body: JSON.stringify(reqBody),
    });

    if (response.status !== 200 && response.status !== 201) {
      const errText = await response.text();
      throw new Error(`Replicate error (${response.status}): ${errText}`);
    }

    prediction = await response.json();
  } catch (fetchErr) {
    const createRes = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(reqBody),
    });
    if (!createRes.ok) {
      throw new Error(
        `Replicate create error (${createRes.status}): ${await createRes.text()}`
      );
    }
    prediction = await createRes.json();
  }

  const MAX_POLLS = 120;
  let polls = 0;
  while (
    (prediction.status === "starting" || prediction.status === "processing") &&
    polls < MAX_POLLS
  ) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    polls++;
    const pollRes = await fetch(
      (prediction.urls as Record<string, string>).get,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    prediction = await pollRes.json();
  }

  if (prediction.status === "succeeded") {
    return prediction.output;
  }
  throw new Error(
    `Replicate prediction failed (status=${prediction.status}): ${prediction.error || "timeout"}`
  );
}

async function handleDeepInfraImage(body: {
  model: string;
  input: Record<string, unknown>;
}) {
  const token = Deno.env.get("DEEPINFRA_KEY");
  if (!token) throw new Error("DeepInfra not configured");

  const response = await fetch(
    `https://api.deepinfra.com/v1/inference/${body.model}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body.input),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`DeepInfra Image error (${response.status}): ${errText}`);
  }

  return response.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    await verifyAuth(req);

    const { provider, ...payload } = await req.json();
    let result: unknown;

    switch (provider) {
      case "google-vision":
        result = await handleGoogleVision(payload.body);
        break;
      case "replicate":
        result = await handleReplicate(payload);
        break;
      case "deepinfra-image":
        result = await handleDeepInfraImage(payload);
        break;
      default:
        return new Response(
          JSON.stringify({ error: `Unknown provider: ${provider}` }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    if (err.message === "Unauthorized" || err.message === "No authorization header") {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ error: err.message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
