import { supabase } from '@/lib/supabase';
import { ClothingCategory } from '@/types';
import * as FileSystem from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

const VISION_MODEL = 'meta-llama/Llama-3.2-11B-Vision-Instruct';
const TEXT_MODEL = 'meta-llama/Meta-Llama-3.1-70B-Instruct';

export interface ClothingAnalysis {
    name: string;
    category: ClothingCategory;
    brand: string | null;
    colors: string[];
    confidence: number;
    garment_type: string | null;
    layer_type: 'inner' | 'outer' | 'both' | null;
}

export interface ItemResearch {
    estimated_value: number | null;
    model_name: string | null;
    brand: string | null;
    subcategory: string | null;
    tags: string[];
}

async function callDeepInfra(body: Record<string, unknown>): Promise<string> {
    const token = process.env.EXPO_PUBLIC_DEEPINFRA_KEY;
    if (!token) throw new Error('Missing EXPO_PUBLIC_DEEPINFRA_KEY');

    const response = await fetch('https://api.deepinfra.com/v1/openai/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`DeepInfra API error (${response.status}): ${errorBody}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
}

function parseJSON<T>(text: string): T {
    // Try to extract JSON from markdown code blocks first
    const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlock) {
        return JSON.parse(codeBlock[1].trim());
    }
    // Then try raw JSON object
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error(`No JSON found in response: ${text.slice(0, 200)}`);
    // Attempt to fix common JSON errors (like trailing commas)
    let jsonStr = match[0];
    try {
        return JSON.parse(jsonStr);
    } catch (e) {
        // Very basic fix attempt: remove trailing commas before closing braces/brackets
        jsonStr = jsonStr.replace(/,\s*([}\]])/g, '$1');
        return JSON.parse(jsonStr);
    }
}

async function callReplicate(model: string, input: Record<string, unknown>): Promise<any> {
    const token = process.env.EXPO_PUBLIC_REPLICATE_API_TOKEN;
    if (!token) throw new Error('Missing EXPO_PUBLIC_REPLICATE_API_TOKEN');

    const isVersion = !model.includes('/');
    const url = isVersion
        ? 'https://api.replicate.com/v1/predictions'
        : `https://api.replicate.com/v1/models/${model}/predictions`;

    const body: any = { input };
    if (isVersion) body.version = model;

    let prediction: any;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Prefer': 'wait',
            },
            body: JSON.stringify(body),
        });

        if (response.status !== 200 && response.status !== 201) {
            const errorBody = await response.text();
            throw new Error(`Replicate API error (${response.status}): ${errorBody}`);
        }

        prediction = await response.json();
    } catch (fetchErr: unknown) {
        // Prefer: wait may timeout on iOS — fall back to create-then-poll
        if (__DEV__) console.warn('Prefer:wait fetch failed, trying without:', fetchErr);
        const createRes = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });
        if (!createRes.ok) {
            throw new Error(`Replicate create error (${createRes.status}): ${await createRes.text()}`);
        }
        prediction = await createRes.json();
    }

    // Poll until complete (handles both Prefer:wait timeout and standard async)
    const MAX_POLLS = 120;
    let polls = 0;
    while ((prediction.status === 'starting' || prediction.status === 'processing') && polls < MAX_POLLS) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        polls++;
        const pollRes = await fetch(prediction.urls.get, {
            headers: { 'Authorization': `Bearer ${token}` },
        });
        prediction = await pollRes.json();
    }

    if (prediction.status === 'succeeded') {
        return prediction.output;
    } else {
        throw new Error(`Replicate prediction failed (status=${prediction.status}): ${prediction.error || 'timeout'}`);
    }
}

async function callDeepInfraImage(model: string, input: Record<string, unknown>): Promise<string> {
    const token = process.env.EXPO_PUBLIC_DEEPINFRA_KEY;
    if (!token) throw new Error('Missing EXPO_PUBLIC_DEEPINFRA_KEY');

    const url = `https://api.deepinfra.com/v1/inference/${model}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`DeepInfra Image API error (${response.status}): ${errorBody}`);
    }

    const result = await response.json();

    if (result.images && result.images.length > 0) {
        const img = result.images[0];
        if (img.startsWith('http')) return img;
        return img.startsWith('data:') ? img : `data:image/jpeg;base64,${img}`;
    }

    if (result.image && typeof result.image === 'string') {
        const img = result.image;
        if (img.startsWith('http')) return img;
        return img.startsWith('data:') ? img : `data:image/png;base64,${img}`;
    }

    if (result.output && Array.isArray(result.output)) {
        return result.output[0];
    }

    throw new Error(`Unexpected DeepInfra response format: ${JSON.stringify(result).slice(0, 100)}...`);
}

/**
 * Prepares an image for upload/processing by ensuring it's accessible.
 * On iOS, images from ImagePicker might be in a temp location we can't read later.
 * This function copies the file to the app's cache directory to ensure ownership.
 */
async function prepareImageForUpload(uri: string): Promise<string> {
    if (!uri) return uri;
    if (uri.startsWith('http') || uri.startsWith('data:')) return uri;

    try {
        // Ensure standard file:// prefix
        let safeUri = uri;
        if (!safeUri.startsWith('file://') && safeUri.startsWith('/')) {
            safeUri = `file://${safeUri}`;
        }

        // Check if file exists and is accessible
        const info = await FileSystem.getInfoAsync(safeUri);
        if (!info.exists) {
            console.warn(`[prepareImage] File does not exist at: ${safeUri}`);
            // Attempt to use original URI if safeUri failed (fallback)
            const infoOriginal = await FileSystem.getInfoAsync(uri);
            if (infoOriginal.exists) {
                safeUri = uri; // Original was actually correct
            } else {
                throw new Error(`File not found at ${uri}`);
            }
        }

        // Generate a new path in our cache directory
        const filename = safeUri.split('/').pop() || `temp_${Date.now()}.jpg`;
        const destPath = `${FileSystem.cacheDirectory}upload_${Date.now()}_${filename}`;

        // Copy file to ensure we have read permissions
        await FileSystem.copyAsync({
            from: safeUri,
            to: destPath
        });

        if (__DEV__) console.log(`[prepareImage] Copied ${safeUri} -> ${destPath}`);
        return destPath;
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.warn(`[prepareImage] Failed to prepare image ${uri}: ${msg}. Using original.`);
        return uri;
    }
}

export async function analyzeClothingImage(imageUri: string): Promise<ClothingAnalysis> {
    const preparedUri = await prepareImageForUpload(imageUri);
    const base64 = await FileSystem.readAsStringAsync(preparedUri, {
        encoding: FileSystem.EncodingType.Base64,
    });

    const content = await callDeepInfra({
        model: VISION_MODEL,
        messages: [{
            role: 'user',
            content: [
                {
                    type: 'text',
                    text: `Identify this clothing item. Return ONLY valid JSON, no other text.

Categories (pick EXACTLY one): top, bottom, outerwear, dress, shoe, accessory, bag, hat, jewelry, other

Rules:
- t-shirts, shirts, blouses, sweaters, hoodies, tank tops = "top"
- pants, jeans, shorts, skirts, trousers, leggings = "bottom"
- jackets, coats, blazers, vests, windbreakers = "outerwear"
- sneakers, boots, heels, sandals, loafers, slides = "shoe"
- bags, backpacks, purses, totes = "bag"
- dresses, jumpsuits, rompers = "dress"
- hats, caps, beanies = "hat"
- necklaces, rings, earrings, bracelets, watches = "jewelry"
- belts, scarves, sunglasses, ties, gloves = "accessory"

{
  "name": "descriptive name like Oversized Denim Jacket",
  "category": "one of the categories above",
  "brand": "brand name or null",
  "colors": ["primary color names"],
  "confidence": 0.0 to 1.0,
  "garment_type": "specific type like polo, cargo pants, chelsea boots, or null",
  "layer_type": "inner or outer or both or null"
}`,
                },
                {
                    type: 'image_url',
                    image_url: { url: `data:image/jpeg;base64,${base64}` },
                },
            ],
        }],
        max_tokens: 512,
        temperature: 0.2,
    });

    const parsed = parseJSON<ClothingAnalysis>(content);

    const validCategories: ClothingCategory[] = [
        'top', 'bottom', 'outerwear', 'dress', 'shoe',
        'accessory', 'bag', 'hat', 'jewelry', 'other',
    ];
    if (!validCategories.includes(parsed.category)) {
        parsed.category = 'other';
    }

    return parsed;
}

export async function researchClothingItem(
    name: string,
    brand: string | null,
    category: string,
): Promise<ItemResearch> {
    const query = [name, brand, category].filter(Boolean).join(' ');

    const content = await callDeepInfra({
        model: TEXT_MODEL,
        messages: [
            {
                role: 'system',
                content: 'You are a fashion expert. Given a clothing item description, provide pricing and detail information. Return ONLY valid JSON.',
            },
            {
                role: 'user',
                content: `Research this clothing item: "${query}"

Return JSON:
{
  "estimated_value": retail price in USD as number or null,
  "model_name": "specific product model name or null",
  "brand": "confirmed brand name or null",
  "subcategory": "specific subcategory like polo shirt, cargo pants, etc. or null",
  "tags": ["relevant style tags like casual, streetwear, formal, vintage, etc."]
}`,
            },
        ],
        max_tokens: 512,
        temperature: 0.3,
    });

    return parseJSON<ItemResearch>(content);
}

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export async function chatWithStylist(
    messages: ChatMessage[],
    closetContext: string,
): Promise<string> {
    const systemMessage: ChatMessage = {
        role: 'system',
        content: `You are a personal AI stylist. You know the user's wardrobe and help them put together outfits, suggest styling tips, and answer fashion questions. Be concise, friendly, and specific. Reference items from their closet when possible.

The user's closet contains:
${closetContext}`,
    };

    const content = await callDeepInfra({
        model: TEXT_MODEL,
        messages: [systemMessage, ...messages],
        max_tokens: 1024,
        temperature: 0.7,
    });

    return content;
}

/* ─── Outfit Analysis (Fit Pic) ─── */

export interface OutfitDetection {
    name: string;
    category: string;
    brand: string;
    brandConfidence: number;
    modelName: string;
    estimatedValue: number | null;
    colors: string[];
    confidence: number;
    box_2d?: [number, number, number, number]; // [ymin, xmin, ymax, xmax] normalized 0-100
}

export interface OutfitAnalysis {
    detections: OutfitDetection[];
    overallStyle?: string;
    occasion?: string;
}

export async function analyzeOutfitImage(imageUri: string): Promise<OutfitAnalysis> {
    const preparedUri = await prepareImageForUpload(imageUri);
    // Resize to max 1024x1024 to avoid huge payloads/timeouts
    const { uri: resizedUri } = await manipulateAsync(
        preparedUri,
        [{ resize: { width: 1024, height: 1024 } }],
        { compress: 0.8, format: SaveFormat.JPEG }
    );

    const base64 = await FileSystem.readAsStringAsync(resizedUri, {
        encoding: FileSystem.EncodingType.Base64,
    });

    const prompt = `You are a fashion expert analyzing an outfit photo. Identify EVERY visible clothing item.

Categories: top, bottom, outerwear, dress, shoe, accessory, bag, hat, jewelry, other.

For EACH item, provide details and its BOUNDING BOX (box_2d) as [ymin, xmin, ymax, xmax] using 0-100 scale.
You MUST find at least 1 item.

IMPORTANT for "name": Be VERY specific and descriptive. Include color, style and type.
  Good: "bright yellow bodycon midi dress", "white chunky platform sneakers", "oversized black leather bomber jacket"
  Bad: "dress", "shoes", "jacket"

IMPORTANT for "colors": List ALL visible colors precisely.
  Good: ["bright yellow", "gold"], ["off-white", "cream"]
  Bad: ["yellow"], ["white"]

Return ONLY valid JSON in this exact format:
{
  "detections": [
    {
      "name": "very specific descriptive name with colors",
      "category": "top",
      "brand": "Brand",
      "brandConfidence": 0.8,
      "modelName": "Model",
      "estimatedValue": 50,
      "colors": ["color"],
      "confidence": 0.9,
      "box_2d": [10, 10, 50, 50]
    }
  ],
  "overallStyle": "casual",
  "occasion": "casual"
}

CRITICAL: Return ONLY raw JSON. No markdown formatting. No explanation.`;

    if (__DEV__) console.log('[DetectFit] Calling DeepInfra (Llama 3.2 Vision)...');

    const content = await callDeepInfra({
        model: VISION_MODEL,
        messages: [{
            role: 'user',
            content: [
                {
                    type: 'text',
                    text: prompt,
                },
                {
                    type: 'image_url',
                    image_url: { url: `data:image/jpeg;base64,${base64}` },
                },
            ],
        }],
        max_tokens: 2000,
        temperature: 0.2, // Low temp for valid JSON
    });

    if (__DEV__) console.log('[DetectFit] Raw output:', content.slice(0, 100) + '...');

    const parsed = parseJSON<OutfitAnalysis>(content);

    // Validate
    if (!parsed.detections || !Array.isArray(parsed.detections)) {
        parsed.detections = [];
    }
    return {
        detections: parsed.detections,
        overallStyle: parsed.overallStyle,
        occasion: parsed.occasion,
    };
}


/* ─── Digital Twin Generation ─── */

export interface DigitalTwinAnalysis {
    ai_description: string;
    body_type: string;
    style_recommendations: string;
    twin_image_url: string;
}

/**
 * Save a base64-encoded image to the local filesystem.
 */
async function saveBase64Image(b64: string): Promise<string> {
    const fileName = `twin_${Date.now()}.jpg`;
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;
    await FileSystem.writeAsStringAsync(fileUri, b64, {
        encoding: FileSystem.EncodingType.Base64,
    });
    return fileUri;
}

/**
 * Generate a digital twin using Nano Banana + cdingram/face-swap pipeline.
 * No vision model needed — uses user-provided selfie, skin color, hair color directly.
 */
export async function generateDigitalTwin(
    selfieUri: string,
    skinColor: string,
    hairColor: string,
    additionalDetails: string,
    bodyPhotoUri?: string,
): Promise<DigitalTwinAnalysis> {
    const preparedSelfie = await prepareImageForUpload(selfieUri);
    const base64Selfie = await FileSystem.readAsStringAsync(preparedSelfie, {
        encoding: FileSystem.EncodingType.Base64,
    });

    let bodyBase64: string | undefined;
    if (bodyPhotoUri) {
        const preparedBody = await prepareImageForUpload(bodyPhotoUri);
        bodyBase64 = await FileSystem.readAsStringAsync(preparedBody, {
            encoding: FileSystem.EncodingType.Base64,
        });
    }

    // Call edge function with Nano Banana + face-swap pipeline
    const { data, error } = await supabase.functions.invoke('ai-image', {
        body: {
            mode: 'twin',
            imageBase64: base64Selfie,
            selfieBase64: base64Selfie,
            bodyBase64,
            skinColor,
            hairColor,
            additionalDetails,
        },
    });

    if (error) {
        throw new Error(`Twin generation failed: ${error.message}`);
    }
    if (data?.error) {
        throw new Error(data.error);
    }
    const b64 = data?.data?.[0]?.b64_json;
    if (!b64) throw new Error('No image data in twin generation response');

    const twinImageUrl = await saveBase64Image(b64);

    return {
        ai_description: `Person with ${skinColor} skin tone and ${hairColor} hair color.${additionalDetails ? ` ${additionalDetails}` : ''}`,
        body_type: 'average',
        style_recommendations: 'Experiment with complementary colors and well-fitted silhouettes.',
        twin_image_url: twinImageUrl,
    };
}

/* ─── Clean Product Image Regeneration ─── */

export interface ProductIdentification {
    name: string;
    brand: string | null;
    category: ClothingCategory;
    garment_type: string | null;
    colors: string[];
    material: string | null;
    description: string;
    box_2d?: [number, number, number, number]; // [ymin, xmin, ymax, xmax] normalized 0-100
}

/**
 * Step 1: Identify the product using vision model.
 * This acts like a "Google Lens" — identifies what the clothing item is,
 * its brand, specific model, colors, and material.
 */
export async function identifyProduct(imageUri: string): Promise<ProductIdentification> {
    const preparedUri = await prepareImageForUpload(imageUri);
    const base64 = await FileSystem.readAsStringAsync(preparedUri, {
        encoding: FileSystem.EncodingType.Base64,
    });

    const content = await callDeepInfra({
        model: VISION_MODEL,
        messages: [{
            role: 'user',
            content: [
                {
                    type: 'text',
                    text: `You are a fashion product identification expert. Identify this clothing item as precisely as possible, like a reverse image search engine.

Provide:
1. Full product name (e.g. "Nike Air Max 90", "Levi's 501 Original Fit Jeans")
2. Brand (be specific or null)
3. Category: top, bottom, outerwear, dress, shoe, accessory, bag, hat, jewelry, other
4. Garment type (e.g. "bomber jacket", "cargo pants", "chelsea boots")
5. Main colors
6. Primary material (cotton, leather, polyester, denim, etc.)
7. A concise product description for generating a clean product image
8. BOUNDING BOX (box_2d) of the item as [ymin, xmin, ymax, xmax] using 0-100 scale.

Return ONLY valid JSON:
{
  "name": "product name",
  "brand": "brand or null",
  "category": "category",
  "garment_type": "specific garment type",
  "colors": ["color1", "color2"],
  "material": "primary material or null",
  "description": "A concise 1-sentence description of the item's appearance for image generation",
  "box_2d": [10, 10, 90, 90]
}`,
                },
                {
                    type: 'image_url',
                    image_url: { url: `data:image/jpeg;base64,${base64}` },
                },
            ],
        }],
        max_tokens: 512,
        temperature: 0.2,
    });

    const parsed = parseJSON<ProductIdentification>(content);

    const validCategories: ClothingCategory[] = [
        'top', 'bottom', 'outerwear', 'dress', 'shoe',
        'accessory', 'bag', 'hat', 'jewelry', 'other',
    ];
    if (!validCategories.includes(parsed.category)) {
        parsed.category = 'other';
    }

    return parsed;
}

/**
 * Generate an outfit try-on image using the digital twin.
 *
 * Strategy:
 *   1. PRIMARY — google/nano-banana (Gemini 2.5 Flash Image) via Replicate
 *      Sends person image + ALL garment images in a single call.
 *      Supports ALL categories: top, bottom, outerwear, dress, shoes, accessories, etc.
 *   2. FALLBACK — FLUX Kontext with collage (if Replicate is unavailable)
 */
export interface OutfitTwinItem {
    name: string;
    category: string;
    imageUri: string;
}

export async function generateOutfitTwin(
    twinImageUrl: string,
    outfitItems: OutfitTwinItem[],
    textPrompt?: string,
    selfieUrl?: string,
): Promise<string> {
    // Read the twin base image (handle both local and remote URLs)
    let twinBase64: string;
    if (twinImageUrl.startsWith('http://') || twinImageUrl.startsWith('https://')) {
        // Remote URL — download to a temp file first
        const tmpPath = `${FileSystem.cacheDirectory}tmp_twin_${Date.now()}.jpg`;
        const downloadResult = await FileSystem.downloadAsync(twinImageUrl, tmpPath);
        twinBase64 = await FileSystem.readAsStringAsync(downloadResult.uri, {
            encoding: FileSystem.EncodingType.Base64,
        });
    } else {
        const preparedTwin = await prepareImageForUpload(twinImageUrl);
        twinBase64 = await FileSystem.readAsStringAsync(preparedTwin, {
            encoding: FileSystem.EncodingType.Base64,
        });
    }

    // Resize all clothing images and convert to base64
    const clothingImages: { base64: string; name: string; category: string }[] = [];
    const errors: string[] = [];
    for (const item of outfitItems) {
        try {
            let sourceUri = item.imageUri;
            // Handle remote URLs — download first
            if (sourceUri.startsWith('http://') || sourceUri.startsWith('https://')) {
                const tmpPath = `${FileSystem.cacheDirectory}tmp_garment_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
                const dl = await FileSystem.downloadAsync(sourceUri, tmpPath);
                sourceUri = dl.uri;
            } else {
                // Ensure local file is accessible (iOS permission fix)
                sourceUri = await prepareImageForUpload(sourceUri);
            }
            const resized = await manipulateAsync(
                sourceUri,
                [{ resize: { width: 256 } }],
                { format: SaveFormat.JPEG, compress: 0.7 },
            );
            const b64 = await FileSystem.readAsStringAsync(resized.uri, {
                encoding: FileSystem.EncodingType.Base64,
            });
            clothingImages.push({ base64: b64, name: item.name, category: item.category });
            if (__DEV__) console.log(`[VTON] Loaded garment: ${item.name} (${item.category}), b64 len: ${b64.length}`);
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            errors.push(`${item.name}: ${msg}`);
            if (__DEV__) console.warn(`[VTON] Failed to load garment ${item.name}:`, e);
        }
    }

    if (clothingImages.length === 0) {
        throw new Error(`No clothing images could be loaded. Debug: ${errors.join(' | ')}`);
    }

    // ─── Strategy 1: google/nano-banana via Replicate (all categories) ───
    try {
        // Resize twin image to reduce payload (VTON doesn't need huge images)
        const twinResized = await manipulateAsync(
            twinImageUrl.startsWith('http') ? twinImageUrl : twinImageUrl,
            [{ resize: { width: 384 } }],
            { format: SaveFormat.JPEG, compress: 0.7 },
        );
        const twinB64ForVton = await FileSystem.readAsStringAsync(twinResized.uri, {
            encoding: FileSystem.EncodingType.Base64,
        });

        const totalPayloadChars = twinB64ForVton.length + clothingImages.reduce((s, g) => s + g.base64.length, 0);

        // Read the selfie photo for face-swap if provided
        // Fall back to using the twin image URL if no selfie is available
        let selfieB64: string | undefined;
        const effectiveSelfieUrl = selfieUrl || twinImageUrl;
        if (__DEV__) console.log(`[VTON] selfieUrl param: ${selfieUrl ? selfieUrl.slice(0, 80) + '...' : 'NOT PROVIDED'}`);
        if (__DEV__) console.log(`[VTON] effectiveSelfieUrl: ${effectiveSelfieUrl.slice(0, 80)}...`);
        if (effectiveSelfieUrl) {
            try {
                let selfieSourceUri = effectiveSelfieUrl;
                if (selfieSourceUri.startsWith('http://') || selfieSourceUri.startsWith('https://')) {
                    const tmpPath = `${FileSystem.cacheDirectory}tmp_selfie_${Date.now()}.jpg`;
                    const dl = await FileSystem.downloadAsync(selfieSourceUri, tmpPath);
                    selfieSourceUri = dl.uri;
                }
                const selfieResized = await manipulateAsync(
                    selfieSourceUri,
                    [{ resize: { width: 512 } }],
                    { format: SaveFormat.JPEG, compress: 0.8 },
                );
                selfieB64 = await FileSystem.readAsStringAsync(selfieResized.uri, {
                    encoding: FileSystem.EncodingType.Base64,
                });
                if (__DEV__) console.log(`[VTON] Selfie loaded for face-swap, b64 len: ${selfieB64.length}`);
            } catch (e) {
                if (__DEV__) console.warn('[VTON] Failed to load selfie for face-swap:', e);
            }
        }

        if (__DEV__) {
            console.log(`[VTON] Twin base64 length: ${twinB64ForVton.length}`);
            console.log(`[VTON] Total payload ~${Math.round(totalPayloadChars / 1024)}KB`);
            console.log(`[VTON] Sending ${clothingImages.length} garments:`, clothingImages.map(g => `${g.name}(${g.category})`));
        }

        const resp = await supabase.functions.invoke('ai-image', {
            body: {
                mode: 'vton',
                imageBase64: twinB64ForVton,
                selfieBase64: selfieB64,
                garments: clothingImages.map(img => ({
                    base64: img.base64,
                    category: img.category,
                    name: img.name,
                })),
            },
        });

        if (__DEV__) {
            console.log('[VTON] Edge function response:', {
                hasError: !!resp.error,
                errorMsg: resp.error?.message,
                dataKeys: resp.data ? Object.keys(resp.data) : 'null',
                dataError: resp.data?.error,
            });
        }

        // supabase.functions.invoke puts response body in `data` even on non-2xx
        // The `error` is a generic wrapper — actual error details are in data.error
        if (resp.data?.error) {
            throw new Error(`VTON server: ${resp.data.error}`);
        }
        if (resp.error && !resp.data?.data) {
            throw new Error(`Edge function: ${resp.error.message || JSON.stringify(resp.error)}`);
        }
        if (resp.data?.data?.[0]?.b64_json) {
            return await saveBase64Image(resp.data.data[0].b64_json);
        }
        throw new Error(`VTON returned unexpected response: ${JSON.stringify(resp.data).slice(0, 200)}`);
    } catch (e) {
        if (__DEV__) console.warn('Nano Banana try-on failed, falling back to FLUX collage:', e);
    }

    // ─── Strategy 2 (Fallback): FLUX Kontext with collage ───
    const itemDescriptions = clothingImages
        .map((img, i) => `${i + 1}. ${img.name} (${img.category})`)
        .join('\n');
    const sceneDesc = textPrompt ? `\nScene/setting: ${textPrompt}` : '';

    const prompt = `The image is a reference collage. The LEFT side shows a person. The RIGHT side shows the specific clothing items they should wear.

Generate a NEW full-body photograph showing ONLY the person from the left side, now wearing EXACTLY the clothing items shown on the right side. Output a single photo of the dressed person, NOT a collage.

Clothing items shown on the right (top to bottom):
${itemDescriptions}

CRITICAL RULES:
- The person must remain IDENTICAL: same face, same skin tone, same hair, same body proportions, same pose
- Each clothing item must EXACTLY match what is shown on the right side of the reference
- Do NOT generate a collage — output a single photo of the fully dressed person
- Full-body shot, head to toe, standing pose
- Professional studio photography, clean neutral background, good lighting${sceneDesc}`;

    try {
        const { data, error } = await supabase.functions.invoke('ai-image', {
            body: {
                prompt,
                imageBase64: twinBase64,
                clothingImages: clothingImages.map(img => ({ base64: img.base64 })),
                model: 'black-forest-labs/FLUX.1-Kontext-dev',
                size: '768x1024',
            },
        });
        if (!error && data?.data?.[0]?.b64_json) {
            return await saveBase64Image(data.data[0].b64_json);
        }
        if (data?.error) {
            throw new Error(data.error);
        }
    } catch (e) {
        if (__DEV__) console.warn('FLUX collage try-on also failed:', e);
    }

    throw new Error('Virtual try-on failed. Please try again.');
}

/**
 * Pipeline 1 (Add Item): RMBG-2.0 only — fast bg removal on cropped image
 * Pipeline 2 (Detect Fit): Seedream → RMBG-2.0 — regenerate + clean
 */
export async function regenerateCleanImage(
    imageUri: string,
    _product: ProductIdentification,
    pipelineType: 'add-item-bria' | 'detect-fit-seedream' = 'add-item-bria'
): Promise<string> {

    const resizeWidth = pipelineType === 'add-item-bria' ? 512 : 1024;
    const { uri: resizedUri } = await manipulateAsync(
        imageUri,
        [{ resize: { width: resizeWidth, height: resizeWidth } }],
        { compress: 0.9, format: SaveFormat.JPEG }
    );
    const base64 = await FileSystem.readAsStringAsync(resizedUri, {
        encoding: FileSystem.EncodingType.Base64,
    });
    const currentImageUri = `data:image/jpeg;base64,${base64}`;

    try {
        let resultUri: string;

        if (pipelineType === 'detect-fit-seedream') {
            if (__DEV__) console.log('Pipeline 2: Calling Replicate Seedream-4...');

            const colorInfo = _product.colors.length > 0 ? ` The exact colors are: ${_product.colors.join(', ')}.` : '';
            const prompt = `Photograph this exact ${_product.description || _product.name} on a clean white studio background. PRESERVE the EXACT colors, patterns, textures, and design details of the original garment — do NOT change or reinterpret anything.${colorInfo} Product photography style, high quality, 8k.`;

            const seedreamOutput = await callReplicate('bytedance/seedream-4', {
                image: currentImageUri,
                prompt: prompt,
            });

            let seedreamResult = Array.isArray(seedreamOutput) ? seedreamOutput[0] : seedreamOutput;
            if (seedreamResult && typeof seedreamResult === 'object' && 'url' in seedreamResult) {
                seedreamResult = (seedreamResult as { url: string }).url;
            }
            if (!seedreamResult || typeof seedreamResult !== 'string') {
                throw new Error(`Seedream returned unexpected format: ${JSON.stringify(seedreamOutput).slice(0, 200)}`);
            }
            if (__DEV__) console.log('Seedream complete, result:', seedreamResult.slice(0, 80));

            // Download Seedream URL to base64 for RMBG-2.0
            try {
                if (__DEV__) console.log('Step 2: Removing background with RMBG-2.0...');
                let rmbgInput = seedreamResult;
                if (seedreamResult.startsWith('http')) {
                    const tmpPath = `${FileSystem.cacheDirectory}tmp_seedream_${Date.now()}.jpg`;
                    const dl = await FileSystem.downloadAsync(seedreamResult, tmpPath);
                    const dlB64 = await FileSystem.readAsStringAsync(dl.uri, { encoding: FileSystem.EncodingType.Base64 });
                    rmbgInput = `data:image/jpeg;base64,${dlB64}`;
                }
                resultUri = await callDeepInfraImage('briaai/RMBG-2.0', { image: rmbgInput });
            } catch (rmbgErr) {
                if (__DEV__) console.warn('RMBG failed, using seedream output directly:', rmbgErr);
                resultUri = seedreamResult;
            }

        } else {
            // Pipeline 1: Just RMBG-2.0 — fast bg removal
            if (__DEV__) console.log('Pipeline 1: RMBG-2.0 bg removal...');
            resultUri = await callDeepInfraImage('briaai/RMBG-2.0', { image: currentImageUri });
        }

        if (!resultUri) throw new Error('No result from clean pipeline');
        const fileName = `clean_${Date.now()}.png`;
        const fileUri = `${FileSystem.documentDirectory}${fileName}`;

        if (resultUri.startsWith('data:')) {
            const base64Data = resultUri.split(',')[1];
            await FileSystem.writeAsStringAsync(fileUri, base64Data, {
                encoding: FileSystem.EncodingType.Base64,
            });
        } else {
            const downloadRes = await FileSystem.downloadAsync(resultUri, fileUri);
            if (downloadRes.status !== 200) throw new Error(`Failed to download result: ${downloadRes.status}`);
        }

        return fileUri;

    } catch (e) {
        if (__DEV__) console.warn('Clean pipeline failed:', e);
        throw new Error(`Clean pipeline failed: ${e instanceof Error ? e.message : String(e)}`);
    }
}
