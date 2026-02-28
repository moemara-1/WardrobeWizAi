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
    const { data, error } = await supabase.functions.invoke('ai-analyze', { body });

    if (error) {
        if (__DEV__) console.error('[callDeepInfra] Edge function error:', JSON.stringify(error));
        let detail = error.message;
        try {
            const ctx = (error as { context?: Response }).context;
            if (ctx?.json) detail = JSON.stringify(await ctx.json());
        } catch { /* ignore */ }
        throw new Error(`AI service error: ${detail}`);
    }

    if (data?.error) {
        throw new Error(`AI error: ${typeof data.error === 'string' ? data.error : data.error.message || JSON.stringify(data.error)}`);
    }

    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
        throw new Error(`AI returned empty response: ${JSON.stringify(data).slice(0, 300)}`);
    }
    return content;
}

function parseJSON<T>(text: string): T {
    const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlock) {
        return JSON.parse(codeBlock[1].trim());
    }
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error(`No JSON found in response: ${text.slice(0, 200)}`);
    let jsonStr = match[0];
    try {
        return JSON.parse(jsonStr);
    } catch (e) {
        jsonStr = jsonStr.replace(/,\s*([}\]])/g, '$1');
        return JSON.parse(jsonStr);
    }
}

async function callReplicate(model: string, input: Record<string, unknown>): Promise<unknown> {
    const { data, error } = await supabase.functions.invoke('ai-proxy', {
        body: { provider: 'replicate', model, input },
    });
    if (error) throw new Error(`Replicate proxy error: ${error.message}`);
    if (data?.error) throw new Error(`Replicate error: ${typeof data.error === 'string' ? data.error : JSON.stringify(data.error)}`);
    return data;
}

async function callDeepInfraImage(model: string, input: Record<string, unknown>): Promise<string> {
    const { data: result, error } = await supabase.functions.invoke('ai-proxy', {
        body: { provider: 'deepinfra-image', model, input },
    });
    if (error) throw new Error(`DeepInfra Image proxy error: ${error.message}`);
    if (result?.error) throw new Error(`DeepInfra Image error: ${typeof result.error === 'string' ? result.error : JSON.stringify(result.error)}`);

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

interface GoogleVisionBox {
    name: string;
    score: number;
    boundingPoly: { normalizedVertices: { x: number; y: number }[] };
}

async function callGoogleVision(base64: string): Promise<GoogleVisionBox[]> {
    const { data, error } = await supabase.functions.invoke('ai-proxy', {
        body: {
            provider: 'google-vision',
            body: {
                requests: [{
                    image: { content: base64 },
                    features: [{ type: 'OBJECT_LOCALIZATION', maxResults: 10 }],
                }],
            },
        },
    });
    if (error) throw new Error(`Google Vision proxy error: ${error.message}`);
    if (data?.error) throw new Error(`Google Vision error: ${typeof data.error === 'string' ? data.error : JSON.stringify(data.error)}`);
    return data?.responses?.[0]?.localizedObjectAnnotations || [];
}

async function prepareImageForUpload(uri: string): Promise<string> {
    if (!uri) return uri;
    if (uri.startsWith('http') || uri.startsWith('data:')) return uri;

    try {
        let safeUri = uri;
        if (!safeUri.startsWith('file://') && safeUri.startsWith('/')) {
            safeUri = `file://${safeUri}`;
        }

        const info = await FileSystem.getInfoAsync(safeUri);
        if (!info.exists) {
            console.warn(`[prepareImage] File does not exist at: ${safeUri}`);
            const infoOriginal = await FileSystem.getInfoAsync(uri);
            if (infoOriginal.exists) {
                safeUri = uri;
            } else {
                throw new Error(`File not found at ${uri}`);
            }
        }

        const filename = safeUri.split('/').pop() || `temp_${Date.now()}.jpg`;
        const destPath = `${FileSystem.cacheDirectory}upload_${Date.now()}_${filename}`;

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
    const base64 = await readFileAsBase64(imageUri);

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
        max_tokens: 256,
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
        max_tokens: 256,
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

/* ─── Smart Outfit Assembly ─── */

interface SmartOutfitItem {
    id: string;
    name: string;
    category: string;
    colors: string[];
    tags: string[];
}

export async function generateSmartOutfit(
    items: SmartOutfitItem[],
    filters: { style: string[]; color: string[]; weather: string[] },
): Promise<string[]> {
    const itemList = items.map(i =>
        `ID:${i.id} | ${i.name} | ${i.category} | colors: ${i.colors.join(', ')} | tags: ${i.tags.join(', ')}`
    ).join('\n');

    const filterDesc = [
        filters.style.length > 0 ? `Style: ${filters.style.join(', ')}` : '',
        filters.color.length > 0 ? `Color palette: ${filters.color.join(', ')}` : '',
        filters.weather.length > 0 ? `Weather: ${filters.weather.join(', ')}` : '',
    ].filter(Boolean).join('. ');

    const content = await callDeepInfra({
        model: TEXT_MODEL,
        messages: [
            {
                role: 'system',
                content: 'You are a fashion stylist AI. Pick a cohesive outfit from the given items. Consider color coordination, layering, and style consistency. Return ONLY a JSON array of item IDs.',
            },
            {
                role: 'user',
                content: `Pick a complete outfit (top + bottom + optional outerwear + optional shoes) from these items:
${itemList}

${filterDesc ? `Preferences: ${filterDesc}` : 'Pick the most stylish combination.'}

Return ONLY a JSON array of IDs like: ["id1", "id2", "id3"]`,
            },
        ],
        max_tokens: 256,
        temperature: 0.7,
    });

    const match = content.match(/\[[\s\S]*?\]/);
    if (!match) return [];
    try {
        const ids: string[] = JSON.parse(match[0]);
        return ids.filter(id => items.some(i => i.id === id));
    } catch {
        return [];
    }
}

/* ─── Trip Planner ─── */

export interface TripDayPlan {
    label: string;
    outfitSuggestion: string;
    activities: string;
    packingTips: string;
}

export async function generateTripPlan(
    destinations: string[],
    occasion: string,
    days: number,
    closetSummary: string,
): Promise<TripDayPlan[]> {
    const destText = destinations.join(', ');
    const content = await callDeepInfra({
        model: TEXT_MODEL,
        messages: [
            {
                role: 'system',
                content: 'You are a personal travel stylist. Generate a concise day-by-day trip wardrobe plan. Each day must have outfitSuggestion (1 sentence referencing closet pieces), activities (2-3 suggested activities for that destination), and packingTips (1 packing tip). Return ONLY valid JSON.',
            },
            {
                role: 'user',
                content: `Plan a ${days}-day ${occasion} trip to ${destText}.

The traveler's closet includes: ${closetSummary || 'a mix of casual and smart casual pieces'}

Return a JSON array with ${days + 1} objects (first is "Travel Day", then "Day 1" through "Day ${days}"):
[
  { "label": "Travel Day", "outfitSuggestion": "...", "activities": "...", "packingTips": "..." },
  { "label": "Day 1", "outfitSuggestion": "...", "activities": "...", "packingTips": "..." }
]`,
            },
        ],
        max_tokens: 1024,
        temperature: 0.7,
    });

    const match = content.match(/\[[\s\S]*?\]/);
    if (!match) return [];
    try {
        return JSON.parse(match[0]) as TripDayPlan[];
    } catch {
        return [];
    }
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
    box_2d?: [number, number, number, number];
}

export interface OutfitAnalysis {
    detections: OutfitDetection[];
    overallStyle?: string;
    occasion?: string;
}

export async function analyzeOutfitImage(imageUri: string): Promise<OutfitAnalysis> {
    const preparedUri = await prepareImageForUpload(imageUri);
    const info = await FileSystem.getInfoAsync(preparedUri);
    if (!info.exists) throw new Error('Image file is no longer available. Please re-upload the photo.');

    const { uri: resizedUri } = await manipulateAsync(
        preparedUri,
        [{ resize: { width: 768, height: 768 } }],
        { compress: 0.8, format: SaveFormat.JPEG }
    );

    const base64 = await FileSystem.readAsStringAsync(resizedUri, {
        encoding: FileSystem.EncodingType.Base64,
    });

    // Strategy 1: Google Vision for fast bounding boxes + LLM for details
    try {
        if (__DEV__) console.log('[DetectFit] Trying Google Vision for fast detection...');
        const visionObjects = await callGoogleVision(base64);

        const clothingLabels = new Set([
            'clothing', 'shirt', 'pants', 'jeans', 'dress', 'skirt', 'jacket',
            'coat', 'shoe', 'footwear', 'boot', 'sneaker', 'hat', 'bag',
            'handbag', 'backpack', 'necklace', 'watch', 'glasses', 'sunglasses',
            'top', 'shorts', 'sweater', 'hoodie', 'vest', 'belt', 'scarf',
            'outerwear', 'blazer', 'sandal',
        ]);

        const clothingBoxes = visionObjects.filter(obj =>
            clothingLabels.has(obj.name.toLowerCase()) || obj.score > 0.6
        );

        if (clothingBoxes.length > 0) {
            if (__DEV__) console.log(`[DetectFit] Google Vision found ${clothingBoxes.length} objects, getting LLM details...`);

            const detectionSummary = clothingBoxes.map(obj => {
                const verts = obj.boundingPoly.normalizedVertices;
                const box = [
                    Math.round((verts[0]?.y ?? 0) * 100),
                    Math.round((verts[0]?.x ?? 0) * 100),
                    Math.round((verts[2]?.y ?? 0) * 100),
                    Math.round((verts[2]?.x ?? 0) * 100),
                ];
                return `${obj.name} (confidence ${(obj.score * 100).toFixed(0)}%) at box [${box.join(',')}]`;
            }).join('\n');

            const detailPrompt = `You are a fashion expert. An object detector found these items in an outfit photo:
${detectionSummary}

For EACH detected clothing item, provide detailed fashion analysis. Categories: top, bottom, outerwear, dress, shoe, accessory, bag, hat, jewelry, other.

Return ONLY valid JSON:
{
  "detections": [
    {
      "name": "very specific descriptive name with colors",
      "category": "category",
      "brand": "Brand or Unknown",
      "brandConfidence": 0.5,
      "modelName": "Model or Unknown",
      "estimatedValue": 50,
      "colors": ["color"],
      "confidence": 0.9,
      "box_2d": [ymin, xmin, ymax, xmax]
    }
  ],
  "overallStyle": "casual",
  "occasion": "casual"
}`;

            const content = await callDeepInfra({
                model: VISION_MODEL,
                messages: [{
                    role: 'user',
                    content: [
                        { type: 'text', text: detailPrompt },
                        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } },
                    ],
                }],
                max_tokens: 1000,
                temperature: 0.2,
            });

            const parsed = parseJSON<OutfitAnalysis>(content);
            if (parsed.detections?.length > 0) {
                return {
                    detections: parsed.detections,
                    overallStyle: parsed.overallStyle,
                    occasion: parsed.occasion,
                };
            }
        }
    } catch (e) {
        if (__DEV__) console.warn('[DetectFit] Google Vision fast path failed, falling back to LLM-only:', e);
    }

    // Strategy 2: Full LLM fallback (original approach)
    if (__DEV__) console.log('[DetectFit] Calling DeepInfra (Llama 3.2 Vision) full analysis...');

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

    const content = await callDeepInfra({
        model: VISION_MODEL,
        messages: [{
            role: 'user',
            content: [
                { type: 'text', text: prompt },
                { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } },
            ],
        }],
        max_tokens: 1000,
        temperature: 0.2,
    });

    if (__DEV__) console.log('[DetectFit] Raw output:', content.slice(0, 100) + '...');

    const parsed = parseJSON<OutfitAnalysis>(content);

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

async function saveBase64Image(b64: string): Promise<string> {
    const fileName = `twin_${Date.now()}.jpg`;
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;
    await FileSystem.writeAsStringAsync(fileUri, b64, {
        encoding: FileSystem.EncodingType.Base64,
    });
    return fileUri;
}

async function readFileAsBase64(uri: string, maxDimension = 1024): Promise<string> {
    const prepared = await prepareImageForUpload(uri);
    const info = await FileSystem.getInfoAsync(prepared);
    if (!info.exists) {
        throw new Error('Image file is no longer available. Please re-upload the photo.');
    }
    const resized = await manipulateAsync(
        prepared,
        [{ resize: { width: maxDimension } }],
        { format: SaveFormat.JPEG, compress: 0.7 },
    );
    return FileSystem.readAsStringAsync(resized.uri, { encoding: FileSystem.EncodingType.Base64 });
}

export async function generateDigitalTwin(
    selfieUri: string,
    skinColor: string,
    hairColor: string,
    additionalDetails: string,
    bodyPhotoUri?: string,
): Promise<DigitalTwinAnalysis> {
    const base64Selfie = await readFileAsBase64(selfieUri);

    let bodyBase64: string | undefined;
    if (bodyPhotoUri) {
        bodyBase64 = await readFileAsBase64(bodyPhotoUri);
    }

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
    box_2d?: [number, number, number, number];
}

export async function identifyProduct(imageUri: string): Promise<ProductIdentification> {
    const base64 = await readFileAsBase64(imageUri);

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
    let twinBase64: string;
    if (twinImageUrl.startsWith('http://') || twinImageUrl.startsWith('https://')) {
        const tmpPath = `${FileSystem.cacheDirectory}tmp_twin_${Date.now()}.jpg`;
        const downloadResult = await FileSystem.downloadAsync(twinImageUrl, tmpPath);
        twinBase64 = await FileSystem.readAsStringAsync(downloadResult.uri, {
            encoding: FileSystem.EncodingType.Base64,
        });
    } else {
        const twinInfo = await FileSystem.getInfoAsync(twinImageUrl);
        if (!twinInfo.exists) {
            throw new Error('Your digital twin image is no longer available. Please regenerate your twin from the Digital Twin screen.');
        }
        twinBase64 = await readFileAsBase64(twinImageUrl);
    }

    const clothingImages: { base64: string; name: string; category: string }[] = [];
    const errors: string[] = [];
    for (const item of outfitItems) {
        try {
            let sourceUri = item.imageUri;
            if (sourceUri.startsWith('http://') || sourceUri.startsWith('https://')) {
                const tmpPath = `${FileSystem.cacheDirectory}tmp_garment_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
                const dl = await FileSystem.downloadAsync(sourceUri, tmpPath);
                sourceUri = dl.uri;
            } else {
                const info = await FileSystem.getInfoAsync(sourceUri);
                if (!info.exists) {
                    errors.push(`${item.name}: file no longer exists`);
                    continue;
                }
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
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            errors.push(`${item.name}: ${msg}`);
        }
    }

    if (clothingImages.length === 0) {
        throw new Error(
            errors.length > 0
                ? `Clothing image files are no longer available. Please re-add these items to your closet: ${errors.map(e => e.split(':')[0]).join(', ')}`
                : 'No clothing images could be loaded.',
        );
    }

    // ─── Strategy 1: google/nano-banana via Replicate (all categories) ───
    // Now supports scene/setting prompts via the scenePrompt param in the edge function.
    try {
        const twinResized = await manipulateAsync(
            twinImageUrl.startsWith('http') ? twinImageUrl : twinImageUrl,
            [{ resize: { width: 384 } }],
            { format: SaveFormat.JPEG, compress: 0.7 },
        );
        const twinB64ForVton = await FileSystem.readAsStringAsync(twinResized.uri, {
            encoding: FileSystem.EncodingType.Base64,
        });

        const totalPayloadChars = twinB64ForVton.length + clothingImages.reduce((s, g) => s + g.base64.length, 0);

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
                ...(textPrompt ? { scenePrompt: textPrompt } : {}),
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
 * Pipeline 1 (Add Item): Bria Fibo Edit (DeepInfra) → Rembg (Replicate)
 * Pipeline 2 (Detect Fit): Seedream (Replicate) → Rembg (Replicate)
 */
export async function regenerateCleanImage(
    imageUri: string,
    _product: ProductIdentification,
    pipelineType: 'add-item-bria' | 'detect-fit-seedream' = 'add-item-bria'
): Promise<string> {

    const resizeTarget = pipelineType === 'detect-fit-seedream' ? 512 : 1024;
    const { uri: resizedUri } = await manipulateAsync(
        imageUri,
        [{ resize: { width: resizeTarget, height: resizeTarget } }],
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

            const desc = _product.description || _product.name;
            const isExtractionPrompt = desc.toLowerCase().startsWith('extract');
            const prompt = isExtractionPrompt
                ? desc
                : `Remove the background and isolate this ${desc} on a plain white background. Keep the garment exactly as-is — same colors, patterns, textures, shape. Clean product photo.`;

            const seedreamOutput = await callReplicate('bytedance/seedream-4', {
                image: currentImageUri,
                prompt: prompt,
                strength: isExtractionPrompt ? 0.55 : 0.35,
                guidance_scale: isExtractionPrompt ? 9 : 7.5,
            });

            let seedreamResult = Array.isArray(seedreamOutput) ? seedreamOutput[0] : seedreamOutput;
            if (seedreamResult && typeof seedreamResult === 'object' && 'url' in seedreamResult) {
                seedreamResult = (seedreamResult as { url: string }).url;
            }
            if (!seedreamResult || typeof seedreamResult !== 'string') {
                throw new Error(`Seedream returned unexpected format: ${JSON.stringify(seedreamOutput).slice(0, 200)}`);
            }
            if (__DEV__) console.log('Seedream complete, result:', seedreamResult.slice(0, 80));

            try {
                if (__DEV__) console.log('Step 2: Removing background with Rembg (Replicate)...');
                const rembgOutput = await callReplicate('fb8af171cfa1616ddcf1242c093f9c46bcada5ad4cf6f2fbe8b81b330ec5c003', {
                    image: seedreamResult,
                });
                const rembgResult = typeof rembgOutput === 'string' ? rembgOutput : (Array.isArray(rembgOutput) ? rembgOutput[0] : '');
                resultUri = rembgResult || seedreamResult;
            } catch (rembgErr) {
                if (__DEV__) console.warn('Rembg failed, using seedream output directly:', rembgErr);
                resultUri = seedreamResult;
            }

        } else {
            // Pipeline 1: Bria Fibo Edit (DeepInfra) + Rembg (Replicate)
            if (__DEV__) console.log('Pipeline 1: Calling DeepInfra Bria/fibo_edit...');

            const prompt = `isolate the clothing piece and display it on a white background like in a product page, DO NOT CHANGE THE CLOTHING PIECE. Subject: ${_product.description || _product.name}`;

            resultUri = await callDeepInfraImage('Bria/fibo_edit', {
                image: currentImageUri,
                prompt: prompt,
            });

            if (__DEV__) console.log('Step 2: Removing background with Rembg (Replicate)...');
            const rembgOutput = await callReplicate('fb8af171cfa1616ddcf1242c093f9c46bcada5ad4cf6f2fbe8b81b330ec5c003', {
                image: resultUri,
            });
            resultUri = typeof rembgOutput === 'string' ? rembgOutput : (Array.isArray(rembgOutput) ? rembgOutput[0] : '');
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

        if (__DEV__) console.log('Falling back to Rembg on original...');
        try {
            const fallbackOutput = await callReplicate('fb8af171cfa1616ddcf1242c093f9c46bcada5ad4cf6f2fbe8b81b330ec5c003', {
                image: currentImageUri,
            });
            const fallbackUri = Array.isArray(fallbackOutput) ? fallbackOutput[0] : fallbackOutput;

            const fileName = `clean_fallback_${Date.now()}.png`;
            const fileUri = `${FileSystem.documentDirectory}${fileName}`;
            const downloadRes = await FileSystem.downloadAsync(fallbackUri, fileUri);
            return downloadRes.uri;
        } catch (err2) {
            throw new Error(`Clean pipeline failed completely: ${e}`);
        }
    }
}
