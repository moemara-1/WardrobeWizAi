// Edge Function: AI Image Generation
// Supports two modes:
//   1. FLUX editing (collage-based, for general image edits)
//   2. Virtual Try-On via google/nano-banana (Gemini 2.5 Flash Image) on Replicate
// Deploy: supabase functions deploy ai-image
// Secrets: supabase secrets set DEEPINFRA_KEY=your-key REPLICATE_API_TOKEN=your-token

import { encode as b64Encode } from "https://deno.land/std@0.177.0/encoding/base64.ts";
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import jpeg from "https://esm.sh/jpeg-js@0.4.4";

const DEEPINFRA_BASE = "https://api.deepinfra.com/v1/openai";
const NANO_BANANA_VERSION = "5bdc2c7cd642ae33611d8c33f79615f98ff02509ab8db9d8ec1cc6c36d378fba";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/* ═══════════════════════════════════════════════════════════════
   Virtual Try-On via google/nano-banana (Gemini 2.5 Flash Image)
   — Accepts ALL garment categories (top, bottom, shoes, accessories, etc.)
   — Single multi-image call instead of iterative per-garment processing
   ═══════════════════════════════════════════════════════════════ */

interface VTONGarment {
  base64: string;
  category: string;
  name: string;
}

/**
 * Run virtual try-on using google/nano-banana on Replicate.
 * Sends person image + all garment images in a single call with a
 * natural language prompt describing how to dress the person.
 */
async function runNanoBanana(
  personB64: string,
  garments: VTONGarment[],
  token: string,
  selfieB64?: string,
  scenePrompt?: string,
): Promise<string> {
  if (garments.length === 0) {
    throw new Error("No clothing items provided for try-on.");
  }

  // Build the image_input array:
  // If we have a separate selfie (face reference), include it as Image 1,
  // with the twin body as Image 2, then garments after.
  // If no selfie, just person + garments.
  const hasSeparateSelfie = selfieB64 && selfieB64 !== personB64;
  const imageInputs: string[] = [];
  let garmentStartIdx: number;

  if (hasSeparateSelfie) {
    imageInputs.push(`data:image/jpeg;base64,${selfieB64}`);   // Image 1: selfie (face)
    imageInputs.push(`data:image/jpeg;base64,${personB64}`);    // Image 2: twin body
    garmentStartIdx = 3;
  } else {
    imageInputs.push(`data:image/jpeg;base64,${personB64}`);    // Image 1: person
    garmentStartIdx = 2;
  }
  // Add garment images
  for (const g of garments) {
    imageInputs.push(`data:image/jpeg;base64,${g.base64}`);
  }

  // Build garment list description
  const garmentList = garments
    .map((g, i) => `Image ${garmentStartIdx + i}: ${g.name} (${g.category})`)
    .join("\n");

  // Determine scene/setting description
  const sceneDesc = scenePrompt
    ? `Setting/scene: ${scenePrompt}. Use this as the background and environment.`
    : 'Professional photography, clean neutral background, good lighting';

  let prompt: string;
  if (hasSeparateSelfie) {
    prompt = `Image 1 is a FACE IDENTITY REFERENCE — a close-up or portrait of a specific real person. Study their face carefully: exact facial features, eye shape, eye color, nose, lips, jawline, skin tone, complexion, eyebrows, hairstyle, hair color.

Image 2 shows this same person's full body — use this for body type, proportions, and build reference.

The remaining images are clothing items to dress this person in:
${garmentList}

Generate a new full-body photograph of the person from Image 1 and Image 2. The FACE must be an exact match to Image 1. The body proportions must match Image 2. Dress them in EXACTLY the clothing items shown in the other images.

FACE (HIGHEST PRIORITY):
- The face MUST be identical to Image 1 — same person, same identity
- Same eyes, nose, lips, jawline, eyebrows, skin tone, moles/freckles
- Same hairstyle and hair color as Image 1
- Do NOT alter, smooth, age, or change the face

CLOTHING:
- Each garment must exactly match its reference image — same color, pattern, fabric, design
- Layer clothing naturally

OUTPUT:
- Full-body shot head to toe, natural standing pose
- ${sceneDesc}
- Single photo of the dressed person, NOT a collage`;
  } else {
    prompt = `Image 1 is a reference photo of a specific real person — this is their IDENTITY REFERENCE. Study their face carefully: their exact facial features, eye shape, eye color, nose shape, lip shape, jawline, skin tone, complexion, freckles/moles, eyebrows, hairstyle, and hair color. The remaining images show specific clothing items:
${garmentList}

Generate a new full-body photograph of THIS EXACT SAME PERSON from Image 1, now wearing the clothing items shown in the other images.

FACE PRESERVATION (HIGHEST PRIORITY):
- The face MUST be a pixel-perfect match to Image 1 — same person, same identity, same exact facial features
- Preserve every facial detail: eye shape, eye color, nose, lips, jawline, eyebrows, skin tone, complexion, any moles or freckles
- The hairstyle and hair color must be IDENTICAL to Image 1
- Do NOT alter, idealize, smooth, age, or change the face in ANY way — this must look like the SAME person took a new photo
- Body proportions and build must match Image 1 exactly

CLOTHING RULES:
- Each clothing item must EXACTLY reproduce what is shown in its reference image — same color, pattern, fabric, and design details
- Layer clothing naturally on the person's body

OUTPUT:
- Full-body shot, head to toe, natural standing pose
- ${sceneDesc}
- Output a single photo of the dressed person, NOT a collage`;
  }

  console.log(`[VTON] Nano Banana: ${hasSeparateSelfie ? 'selfie + twin body' : 'twin only'} + ${garments.length} garments`);
  console.log(`[VTON] Garments: ${garments.map((g) => `${g.name}(${g.category})`).join(", ")}`);
  console.log(`[VTON] Total images: ${imageInputs.length}, prompt length: ${prompt.length}`);

  // Create prediction with Prefer: wait for synchronous response
  let createRes: Response;
  try {
    createRes = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        Authorization: `Token ${token}`,
        "Content-Type": "application/json",
        Prefer: "wait",
      },
      body: JSON.stringify({
        version: NANO_BANANA_VERSION,
        input: {
          prompt,
          image_input: imageInputs,
          aspect_ratio: "match_input_image",
          output_format: "jpg",
        },
      }),
    });
  } catch (fetchErr) {
    throw new Error(`Replicate fetch error: ${fetchErr.message}`);
  }

  if (!createRes.ok) {
    const errBody = await createRes.text().catch(() => "");
    throw new Error(`Replicate API ${createRes.status}: ${errBody.slice(0, 300)}`);
  }

  let prediction = await createRes.json();
  console.log(`[VTON] Prediction status: ${prediction.status}, id: ${prediction.id}`);

  // Poll if the synchronous wait timed out
  if (
    prediction.status &&
    prediction.status !== "succeeded" &&
    prediction.status !== "failed" &&
    prediction.status !== "canceled"
  ) {
    const pollUrl = prediction.urls?.get;
    if (pollUrl) {
      console.log(`[VTON] Polling for completion...`);
      for (let attempt = 0; attempt < 60; attempt++) {
        await new Promise((r) => setTimeout(r, 3000));
        const pollRes = await fetch(pollUrl, {
          headers: { Authorization: `Token ${token}` },
        });
        prediction = await pollRes.json();
        console.log(`[VTON] Poll ${attempt + 1}: status=${prediction.status}`);
        if (["succeeded", "failed", "canceled"].includes(prediction.status)) {
          break;
        }
      }
    }
  }

  if (prediction.status === "failed") {
    throw new Error(`Nano Banana failed: ${prediction.error || "unknown error"}`);
  }

  if (prediction.status !== "succeeded" || !prediction.output) {
    throw new Error(`Nano Banana did not complete: status=${prediction.status}`);
  }

  // Get output URL — nano-banana returns a single URL string or array
  const outputUrl = Array.isArray(prediction.output)
    ? prediction.output[0]
    : prediction.output;
  if (!outputUrl) {
    throw new Error("Nano Banana returned no output URL");
  }

  console.log(`[VTON] Downloading result image...`);
  const imgRes = await fetch(outputUrl);
  if (!imgRes.ok) {
    throw new Error(`Failed to download result: ${imgRes.status}`);
  }

  const imgBuf = new Uint8Array(await imgRes.arrayBuffer());
  const resultB64 = b64Encode(imgBuf);
  console.log(`[VTON] ✓ Result generated — ${Math.round(resultB64.length / 1024)}KB`);
  return resultB64;
}


/* ═══════════════════════════════════════════════════════════════
   Collage helpers (used by FLUX fallback mode)
   ═══════════════════════════════════════════════════════════════ */

interface DecodedImage {
  data: Uint8Array;
  width: number;
  height: number;
}

function decodeBase64Jpeg(b64: string): DecodedImage {
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const decoded = jpeg.decode(bytes, { useTArray: true });
  return {
    data: new Uint8Array(decoded.data),
    width: decoded.width,
    height: decoded.height,
  };
}

function resizeImg(
  src: DecodedImage,
  dstW: number,
  dstH: number,
): DecodedImage {
  const dst = new Uint8Array(dstW * dstH * 4);
  for (let y = 0; y < dstH; y++) {
    for (let x = 0; x < dstW; x++) {
      const srcX = Math.min(
        Math.floor((x * src.width) / dstW),
        src.width - 1,
      );
      const srcY = Math.min(
        Math.floor((y * src.height) / dstH),
        src.height - 1,
      );
      const si = (srcY * src.width + srcX) * 4;
      const di = (y * dstW + x) * 4;
      dst[di] = src.data[si];
      dst[di + 1] = src.data[si + 1];
      dst[di + 2] = src.data[si + 2];
      dst[di + 3] = 255;
    }
  }
  return { data: dst, width: dstW, height: dstH };
}

function fitResize(
  src: DecodedImage,
  maxW: number,
  maxH: number,
): DecodedImage {
  const ar = src.width / src.height;
  let w = maxW;
  let h = Math.round(maxW / ar);
  if (h > maxH) {
    h = maxH;
    w = Math.round(maxH * ar);
  }
  return resizeImg(src, Math.max(1, w), Math.max(1, h));
}

function blit(
  canvas: Uint8Array,
  cW: number,
  cH: number,
  img: DecodedImage,
  ox: number,
  oy: number,
) {
  for (let y = 0; y < img.height; y++) {
    const cy = oy + y;
    if (cy < 0 || cy >= cH) continue;
    for (let x = 0; x < img.width; x++) {
      const cx = ox + x;
      if (cx < 0 || cx >= cW) continue;
      const si = (y * img.width + x) * 4;
      const di = (cy * cW + cx) * 4;
      canvas[di] = img.data[si];
      canvas[di + 1] = img.data[si + 1];
      canvas[di + 2] = img.data[si + 2];
      canvas[di + 3] = 255;
    }
  }
}

function createCollage(
  twinB64: string,
  clothingB64s: { base64: string }[],
): Uint8Array {
  const W = 1024;
  const H = 1024;
  const GAP = 12;
  const PERSON_W = Math.floor(W * 0.55);
  const ITEMS_W = W - PERSON_W;

  const canvas = new Uint8Array(W * H * 4);
  for (let i = 0; i < canvas.length; i += 4) {
    canvas[i] = 255;
    canvas[i + 1] = 255;
    canvas[i + 2] = 255;
    canvas[i + 3] = 255;
  }

  const twin = decodeBase64Jpeg(twinB64);
  const twinResized = fitResize(twin, PERSON_W - GAP * 2, H - GAP * 2);
  const twinX =
    GAP + Math.floor((PERSON_W - GAP * 2 - twinResized.width) / 2);
  const twinY = GAP + Math.floor((H - GAP * 2 - twinResized.height) / 2);
  blit(canvas, W, H, twinResized, twinX, twinY);

  const n = clothingB64s.length;
  if (n > 0) {
    const cols = n <= 3 ? 1 : 2;
    const rows = Math.ceil(n / cols);
    const cellW = Math.floor((ITEMS_W - GAP * (cols + 1)) / cols);
    const cellH = Math.floor((H - GAP * (rows + 1)) / rows);

    for (let i = 0; i < n; i++) {
      try {
        const img = decodeBase64Jpeg(clothingB64s[i].base64);
        const resized = fitResize(img, cellW, cellH);
        const col = i % cols;
        const row = Math.floor(i / cols);
        const ox =
          PERSON_W +
          GAP +
          col * (cellW + GAP) +
          Math.floor((cellW - resized.width) / 2);
        const oy =
          GAP +
          row * (cellH + GAP) +
          Math.floor((cellH - resized.height) / 2);
        blit(canvas, W, H, resized, ox, oy);
      } catch {
        /* skip */
      }
    }
  }

  const encoded = jpeg.encode({ data: canvas, width: W, height: H }, 85);
  return new Uint8Array(encoded.data);
}

/* ═══════════════════════════════════════════════════════════════
   Main Handler
   ═══════════════════════════════════════════════════════════════ */

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    /* ── Auth (optional — Replicate token is the real server-side auth) ── */
    const authHeader = req.headers.get("authorization");
    let user = null;
    if (authHeader) {
      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } },
      );
      const { data: { user: u }, error: authError } = await supabaseClient.auth.getUser();
      if (authError) {
        console.warn("[AUTH] Could not verify user (stale token?):", authError.message);
      } else {
        user = u;
      }
    }
    console.log(`[AUTH] user=${user?.id ?? "anonymous"} (header=${!!authHeader})`);

    /* ── Parse body ── */
    const body = await req.json();
    const { mode, imageBase64 } = body;

    /* ═════════════════════════════════════
       MODE: vton — Virtual Try-On via Nano Banana + Face-Swap
       ═════════════════════════════════════ */
    if (mode === "vton") {
      const replicateToken = Deno.env.get("REPLICATE_API_TOKEN");
      if (!replicateToken) {
        console.error("[VTON] REPLICATE_API_TOKEN not found in env vars");
        return new Response(
          JSON.stringify({
            error: "REPLICATE_API_TOKEN not configured on server",
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      console.log(`[VTON] Token present (${replicateToken.length} chars), starts with: ${replicateToken.slice(0, 5)}...`);

      const garments: VTONGarment[] = body.garments || [];
      const selfieBase64: string | undefined = body.selfieBase64;
      const scenePrompt: string | undefined = body.scenePrompt;
      console.log(`[VTON] Received ${garments.length} garments, person image b64 length: ${imageBase64?.length || 0}, selfie b64 length: ${selfieBase64?.length || 0}, scene: ${scenePrompt || 'none'}`);

      try {
        const resultB64 = await runNanoBanana(imageBase64, garments, replicateToken, selfieBase64, scenePrompt);

        return new Response(
          JSON.stringify({ data: [{ b64_json: resultB64 }] }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      } catch (vtonErr) {
        console.error("[VTON] runNanoBanana threw:", vtonErr.message);
        return new Response(
          JSON.stringify({ error: vtonErr.message }),
          {
            status: 200, // Return 200 so supabase client can read the error body
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    /* ═════════════════════════════════════
       MODE: cleanup — Product Image Cleanup via SeedReam (Nano Banana)
       Isolates clothing on white background without changing the item
       ═════════════════════════════════════ */
    if (mode === "cleanup") {
      const replicateToken = Deno.env.get("REPLICATE_API_TOKEN");
      if (!replicateToken) {
        return new Response(
          JSON.stringify({ error: "REPLICATE_API_TOKEN not configured on server" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      console.log(`[CLEANUP] Starting product image cleanup...`);

      try {
        const imageDataUri = `data:image/jpeg;base64,${imageBase64}`;

        let createRes = await fetch("https://api.replicate.com/v1/predictions", {
          method: "POST",
          headers: {
            Authorization: `Token ${replicateToken}`,
            "Content-Type": "application/json",
            Prefer: "wait",
          },
          body: JSON.stringify({
            version: NANO_BANANA_VERSION,
            input: {
              prompt: "isolate the clothing piece and display it on a white background like in a product page, DO NOT CHANGE THE CLOTHING PIECE",
              image_input: [imageDataUri],
              aspect_ratio: "1:1",
              width: 1024,
              height: 1024,
              max_images: 1,
              enhance_prompt: true,
              output_format: "jpg",
            },
          }),
        });

        if (!createRes.ok) {
          const errBody = await createRes.text().catch(() => "");
          throw new Error(`Replicate API ${createRes.status}: ${errBody.slice(0, 300)}`);
        }

        let prediction = await createRes.json();
        console.log(`[CLEANUP] Prediction status: ${prediction.status}, id: ${prediction.id}`);

        // Poll if synchronous wait timed out
        if (prediction.status && !["succeeded", "failed", "canceled"].includes(prediction.status)) {
          const pollUrl = prediction.urls?.get;
          if (pollUrl) {
            for (let attempt = 0; attempt < 60; attempt++) {
              await new Promise((r) => setTimeout(r, 3000));
              const pollRes = await fetch(pollUrl, {
                headers: { Authorization: `Token ${replicateToken}` },
              });
              prediction = await pollRes.json();
              console.log(`[CLEANUP] Poll ${attempt + 1}: status=${prediction.status}`);
              if (["succeeded", "failed", "canceled"].includes(prediction.status)) break;
            }
          }
        }

        if (prediction.status === "failed") {
          throw new Error(`Cleanup failed: ${prediction.error || "unknown"}`);
        }
        if (prediction.status !== "succeeded" || !prediction.output) {
          throw new Error(`Cleanup did not complete: status=${prediction.status}`);
        }

        const outputUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
        if (!outputUrl) throw new Error("Cleanup returned no output URL");

        const imgRes = await fetch(outputUrl);
        if (!imgRes.ok) throw new Error(`Failed to download: ${imgRes.status}`);
        const imgBuf = new Uint8Array(await imgRes.arrayBuffer());
        const resultB64 = b64Encode(imgBuf);
        console.log(`[CLEANUP] ✓ Done — ${Math.round(resultB64.length / 1024)}KB`);

        return new Response(
          JSON.stringify({ data: [{ b64_json: resultB64 }] }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      } catch (cleanupErr) {
        console.error("[CLEANUP] Error:", cleanupErr.message);
        return new Response(
          JSON.stringify({ error: cleanupErr.message }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    /* ═════════════════════════════════════       MODE: twin — Digital Twin Generation via Nano Banana + Face-Swap
       ═══════════════════════════════════════ */
    if (mode === "twin") {
      const replicateToken = Deno.env.get("REPLICATE_API_TOKEN");
      if (!replicateToken) {
        return new Response(
          JSON.stringify({ error: "REPLICATE_API_TOKEN not configured on server" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const selfieBase64: string = body.selfieBase64 || imageBase64;
      const bodyBase64: string | undefined = body.bodyBase64;
      const skinColor: string = body.skinColor || "";
      const hairColor: string = body.hairColor || "";
      const additionalDetails: string = body.additionalDetails || "";

      const hasBodyPhoto = !!bodyBase64;

      const outfitDesc = additionalDetails
        ? `They are wearing: ${additionalDetails}.`
        : "They are wearing a plain white oversized crew-neck t-shirt, blue straight-leg chino trousers, and white leather sneakers.";

      const skinDesc = skinColor ? `Skin tone: ${skinColor}.` : "";
      const hairDesc = hairColor ? `Hair color: ${hairColor}.` : "";

      let twinPrompt: string;
      const twinImageInputs: string[] = [
        `data:image/jpeg;base64,${selfieBase64}`,
      ];

      if (hasBodyPhoto) {
        twinImageInputs.push(`data:image/jpeg;base64,${bodyBase64}`);
        twinPrompt = `Image 1 is a close-up or portrait of a specific real person. Study their face carefully: exact facial features, eye shape, eye color, nose, lips, jawline, skin tone, complexion, eyebrows, hairstyle, hair color.
${skinDesc} ${hairDesc}

Image 2 is a full-body or wider photo of this SAME person. Use Image 2 to determine their EXACT body type, build, proportions, height, and frame. Do NOT guess or default — replicate the body shape you see in Image 2 precisely.

Generate a full-body photograph of THIS EXACT SAME PERSON from head to toe, standing on a seamless pure white background.

FACE (HIGHEST PRIORITY):
- The face MUST be identical to Image 1 — same person, same identity
- Same eyes, nose, lips, jawline, eyebrows, skin tone, moles/freckles
- Same hairstyle and hair color as Image 1
- Do NOT alter, smooth, age, or change the face in ANY way

BODY:
- The body type, build, proportions, and frame MUST match Image 2 exactly
- Same height impression, same shoulder width, same overall silhouette
- Accurately reflect the person’s real physique from Image 2

OUTFIT:
${outfitDesc}

POSE & STYLE:
- Standing upright with arms relaxed at sides, facing the camera
- Professional studio photography, soft diffused lighting, no harsh shadows
- Clean e-commerce product style, seamless pure white background
- Single photo, NOT a collage`;
      } else {
        twinPrompt = `Image 1 is a close-up or portrait of a specific real person. Study their face carefully: exact facial features, eye shape, eye color, nose, lips, jawline, skin tone, complexion, eyebrows, hairstyle, hair color.
${skinDesc} ${hairDesc}

Generate a full-body photograph of THIS EXACT SAME PERSON from head to toe, standing on a seamless pure white background.

FACE (HIGHEST PRIORITY):
- The face MUST be identical to Image 1 — same person, same identity
- Same eyes, nose, lips, jawline, eyebrows, skin tone, moles/freckles
- Same hairstyle and hair color as Image 1
- Do NOT alter, smooth, age, or change the face in ANY way

BODY:
- Infer a natural, proportionate body type from the person in Image 1
- Show their entire body from head to shoes

OUTFIT:
${outfitDesc}

POSE & STYLE:
- Standing upright with arms relaxed at sides, facing the camera
- Professional studio photography, soft diffused lighting, no harsh shadows
- Clean e-commerce product style, seamless pure white background
- Single photo, NOT a collage`;
      }

      console.log(`[TWIN] Generating twin via Nano Banana (${hasBodyPhoto ? 'selfie + body photo' : 'selfie only'})...`);

      try {
        // Step 1: Nano Banana — generate full-body image from selfie
        let createRes = await fetch("https://api.replicate.com/v1/predictions", {
          method: "POST",
          headers: {
            Authorization: `Token ${replicateToken}`,
            "Content-Type": "application/json",
            Prefer: "wait",
          },
          body: JSON.stringify({
            version: NANO_BANANA_VERSION,
            input: {
              prompt: twinPrompt,
              image_input: twinImageInputs,
              aspect_ratio: "3:4",
              output_format: "jpg",
            },
          }),
        });

        if (!createRes.ok) {
          const errBody = await createRes.text().catch(() => "");
          throw new Error(`Replicate API ${createRes.status}: ${errBody.slice(0, 300)}`);
        }

        let prediction = await createRes.json();
        console.log(`[TWIN] Prediction status: ${prediction.status}, id: ${prediction.id}`);

        // Poll if needed
        if (
          prediction.status &&
          prediction.status !== "succeeded" &&
          prediction.status !== "failed" &&
          prediction.status !== "canceled"
        ) {
          const pollUrl = prediction.urls?.get;
          if (pollUrl) {
            for (let attempt = 0; attempt < 60; attempt++) {
              await new Promise((r) => setTimeout(r, 3000));
              const pollRes = await fetch(pollUrl, {
                headers: { Authorization: `Token ${replicateToken}` },
              });
              prediction = await pollRes.json();
              console.log(`[TWIN] Poll ${attempt + 1}: status=${prediction.status}`);
              if (["succeeded", "failed", "canceled"].includes(prediction.status)) break;
            }
          }
        }

        if (prediction.status === "failed") {
          throw new Error(`Nano Banana failed: ${prediction.error || "unknown"}`);
        }
        if (prediction.status !== "succeeded" || !prediction.output) {
          throw new Error(`Nano Banana did not complete: status=${prediction.status}`);
        }

        const outputUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
        if (!outputUrl) throw new Error("Nano Banana returned no output URL");

        const imgRes = await fetch(outputUrl);
        if (!imgRes.ok) throw new Error(`Failed to download result: ${imgRes.status}`);
        const imgBuf = new Uint8Array(await imgRes.arrayBuffer());
        let twinB64 = b64Encode(imgBuf);
        console.log(`[TWIN] ✓ Full-body generated — ${Math.round(twinB64.length / 1024)}KB`);

        return new Response(
          JSON.stringify({ data: [{ b64_json: twinB64 }] }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      } catch (twinErr) {
        console.error("[TWIN] Error:", twinErr.message);
        return new Response(
          JSON.stringify({ error: twinErr.message }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    /* ═══════════════════════════════════════       MODE: flux — FLUX Kontext image edit
       ═════════════════════════════════════ */
    const deepInfraKey = Deno.env.get("DEEPINFRA_KEY");
    if (!deepInfraKey) {
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { prompt, clothingImages, model, size } = body;

    let finalImageBlob: Blob;
    if (
      clothingImages &&
      Array.isArray(clothingImages) &&
      clothingImages.length > 0
    ) {
      const collageBytes = createCollage(imageBase64, clothingImages);
      finalImageBlob = new Blob([collageBytes], { type: "image/jpeg" });
    } else {
      const imageBytes = Uint8Array.from(atob(imageBase64), (c) =>
        c.charCodeAt(0),
      );
      finalImageBlob = new Blob([imageBytes], { type: "image/jpeg" });
    }

    const formData = new FormData();
    formData.append(
      "model",
      model || "black-forest-labs/FLUX.1-Kontext-dev",
    );
    formData.append("prompt", prompt);
    formData.append("n", "1");
    formData.append("size", size || "768x1024");
    formData.append("image", finalImageBlob, "image.jpg");

    const response = await fetch(`${DEEPINFRA_BASE}/images/edits`, {
      method: "POST",
      headers: { Authorization: `Bearer ${deepInfraKey}` },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      return new Response(JSON.stringify({ error: data?.error || `DeepInfra returned ${response.status}` }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
