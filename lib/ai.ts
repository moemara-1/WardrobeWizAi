import { ClothingCategory } from '@/types';
import * as FileSystem from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { supabase } from '@/lib/supabase';

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
    const { data, error } = await supabase.functions.invoke('ai-analyze', { body });
    if (error) throw new Error(`AI API error: ${error.message}`);
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
    return JSON.parse(match[0]);
}

export async function analyzeClothingImage(imageUri: string): Promise<ClothingAnalysis> {
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
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
}

export interface OutfitAnalysis {
    detections: OutfitDetection[];
    overallStyle?: string;
    occasion?: string;
}

export async function analyzeOutfitImage(imageUri: string): Promise<OutfitAnalysis> {
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
    });

    const content = await callDeepInfra({
        model: VISION_MODEL,
        messages: [{
            role: 'user',
            content: [
                {
                    type: 'text',
                    text: `Analyze this outfit image and identify each clothing item visible.

For EACH clothing piece, provide:
1. Name/description
2. Category (top, bottom, outerwear, dress, shoe, accessory, bag, hat, jewelry, other)
3. Brand guess (be specific)
4. How confident you are about the brand (0-1)
5. Specific model name if identifiable
6. Estimated retail value in USD
7. Main colors (color names, not hex)
8. Overall confidence in the detection (0-1)

Also identify:
- Overall style (streetwear, casual, formal, sporty, etc.)
- Suggested occasion (everyday, work, date night, gym, etc.)

Return ONLY valid JSON:
{
  "detections": [
    {
      "name": "Air Force 1 Low",
      "category": "shoe",
      "brand": "Nike",
      "brandConfidence": 0.95,
      "modelName": "Air Force 1 07",
      "estimatedValue": 110,
      "colors": ["white"],
      "confidence": 0.98
    }
  ],
  "overallStyle": "streetwear",
  "occasion": "casual"
}`,
                },
                {
                    type: 'image_url',
                    image_url: { url: `data:image/jpeg;base64,${base64}` },
                },
            ],
        }],
        max_tokens: 1500,
        temperature: 0.3,
    });

    try {
        const parsed = parseJSON<OutfitAnalysis>(content);
        return {
            detections: parsed.detections || [],
            overallStyle: parsed.overallStyle,
            occasion: parsed.occasion,
        };
    } catch {
        if (__DEV__) console.warn('Outfit analysis returned non-JSON, using defaults');
        return { detections: [], overallStyle: undefined, occasion: undefined };
    }
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
    const base64Selfie = await FileSystem.readAsStringAsync(selfieUri, {
        encoding: FileSystem.EncodingType.Base64,
    });

    let bodyBase64: string | undefined;
    if (bodyPhotoUri) {
        bodyBase64 = await FileSystem.readAsStringAsync(bodyPhotoUri, {
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
}

/**
 * Step 1: Identify the product using vision model.
 * This acts like a "Google Lens" — identifies what the clothing item is,
 * its brand, specific model, colors, and material.
 */
export async function identifyProduct(imageUri: string): Promise<ProductIdentification> {
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
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

Return ONLY valid JSON:
{
  "name": "product name",
  "brand": "brand or null",
  "category": "category",
  "garment_type": "specific garment type",
  "colors": ["color1", "color2"],
  "material": "primary material or null",
  "description": "A concise 1-sentence description of the item's appearance for image generation"
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
        twinBase64 = await FileSystem.readAsStringAsync(twinImageUrl, {
            encoding: FileSystem.EncodingType.Base64,
        });
    }

    // Resize all clothing images and convert to base64
    const clothingImages: { base64: string; name: string; category: string }[] = [];
    for (const item of outfitItems) {
        try {
            let sourceUri = item.imageUri;
            // Handle remote URLs — download first
            if (sourceUri.startsWith('http://') || sourceUri.startsWith('https://')) {
                const tmpPath = `${FileSystem.cacheDirectory}tmp_garment_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
                const dl = await FileSystem.downloadAsync(sourceUri, tmpPath);
                sourceUri = dl.uri;
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
            if (__DEV__) console.warn(`[VTON] Failed to load garment ${item.name}:`, e);
        }
    }

    if (clothingImages.length === 0) {
        throw new Error('No clothing images could be loaded.');
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
 * Step 2: Regenerate a clean product image using FLUX.1-Kontext-dev.
 * Takes the original photo and transforms it into a clean product shot
 * on a white background, like an e-commerce listing.
 */
export async function regenerateCleanImage(
    imageUri: string,
    product: ProductIdentification,
): Promise<string> {

    // Resize image to max 512x512 for faster upload/inference
    const { uri: resizedUri } = await manipulateAsync(
        imageUri,
        [{ resize: { width: 512, height: 512 } }],
        { compress: 0.9, format: SaveFormat.JPEG }
    );
    const base64 = await FileSystem.readAsStringAsync(resizedUri, {
        encoding: FileSystem.EncodingType.Base64,
    });

    const colorStr = product.colors.join(' and ');
    const materialStr = product.material ? `, ${product.material}` : '';
    const brandStr = product.brand ? `${product.brand} ` : '';

    const prompt = `Transform this into a clean e-commerce product photograph. Show ONLY the ${brandStr}${product.description || product.name} — a ${colorStr}${materialStr} ${product.garment_type || product.category}.

CRITICAL RULES:
- Remove ALL backgrounds, people, mannequins, shadows, reflections, and distractions.
- The item must be perfectly isolated, with NO visible background, NO shadows, NO artifacts, NO person, NO mannequin, NO floor, NO props, NO color cast.
- Place the item flat-lay or floating on a 100% pure seamless WHITE (#FFFFFF) background, edge-to-edge, with no gradient, no texture, no drop shadow, no border, no floor, no horizon, no corners, no surface, no context.
- The result must look like a shopping website product photo: sharp, well-lit, no wrinkles, no background at all, just the item on pure white.`;

    const { data, error } = await supabase.functions.invoke('ai-image', {
        body: {
            prompt,
            imageBase64: base64,
            model: 'black-forest-labs/FLUX.1-Kontext-dev',
            size: '512x512', // Lower resolution for speed
        },
    });
    if (error) throw new Error(`Image generation error: ${error.message}`);
    const b64 = data.data?.[0]?.b64_json;
    if (!b64) throw new Error('No image data in response');

    const fileName = `clean_${Date.now()}.jpg`;
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;
    await FileSystem.writeAsStringAsync(fileUri, b64, {
        encoding: FileSystem.EncodingType.Base64,
    });
    return fileUri;
}
