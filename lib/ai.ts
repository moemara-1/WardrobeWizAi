import { ClothingCategory } from '@/types';
import * as FileSystem from 'expo-file-system/legacy';

const DEEPINFRA_BASE = 'https://api.deepinfra.com/v1/openai';
const VISION_MODEL = 'meta-llama/Llama-3.2-11B-Vision-Instruct';
const TEXT_MODEL = 'meta-llama/Meta-Llama-3.1-70B-Instruct';

const getApiKey = () => process.env.EXPO_PUBLIC_DEEPINFRA_KEY || '';

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
    const response = await fetch(`${DEEPINFRA_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${getApiKey()}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        throw new Error(`DeepInfra API error: ${response.status}`);
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
 * Step 1: Analyze the selfie to get a text description + styling info.
 */
async function describeAppearance(
    selfieBase64: string,
    skinColor: string,
    hairColor: string,
    additionalDetails: string,
): Promise<{ description: string; body_type: string; style_tips: string }> {
    const content = await callDeepInfra({
        model: VISION_MODEL,
        messages: [{
            role: 'user',
            content: [
                {
                    type: 'text',
                    text: `Analyze this person's appearance for a fashion styling profile.

User info:
- Skin tone hex: ${skinColor}
- Hair color hex: ${hairColor}
${additionalDetails ? `- Extra details: ${additionalDetails}` : ''}

Return ONLY valid JSON:
{
  "description": "2-3 sentence physical description: gender, skin tone, face shape, hair style/color, approximate age, build. Third person neutral tone.",
  "body_type": "One of: petite, slim, athletic, average, curvy, tall, broad",
  "style_tips": "2-3 personalized styling tips based on their coloring and build"
}`,
                },
                {
                    type: 'image_url',
                    image_url: { url: `data:image/jpeg;base64,${selfieBase64}` },
                },
            ],
        }],
        max_tokens: 512,
        temperature: 0.3,
    });

    try {
        return parseJSON<{ description: string; body_type: string; style_tips: string }>(content);
    } catch {
        // Vision model refused or returned non-JSON — use sensible defaults
        if (__DEV__) console.warn('Vision model did not return JSON, using defaults. Raw:', content.slice(0, 200));
        return {
            description: `Person with ${hairColor} hair and ${skinColor} skin tone.${additionalDetails ? ` ${additionalDetails}` : ''}`,
            body_type: 'average',
            style_tips: 'Experiment with complementary colors and well-fitted silhouettes.',
        };
    }
}

/**
 * Generate a full-body digital twin image using FLUX.1-Kontext-dev.
 * This model takes BOTH a reference image (selfie/body photo) AND a text prompt,
 * preserving the person's face and identity while transforming into a full-body shot.
 */
async function generateTwinImage(
    imageBase64: string,
    bodyType: string,
    additionalDetails: string,
): Promise<string> {
    const bodyDesc = {
        petite: 'a petite, slender build with a shorter frame',
        slim: 'a slim, lean build',
        athletic: 'an athletic, toned build with defined muscles',
        average: 'an average, proportionate build',
        curvy: 'a curvy build with fuller proportions',
        tall: 'a tall, elongated frame',
        broad: 'a broad, wide-shouldered build',
    }[bodyType] || 'a proportionate build';

    const outfitDesc = additionalDetails
        ? `They are wearing: ${additionalDetails}.`
        : 'They are wearing a plain white oversized crew-neck t-shirt, blue straight-leg chino trousers, and white leather sneakers.';

    const prompt = `Transform this person into a full-body photograph from head to toe, standing on a seamless pure white background. Keep the exact same person, same face, same skin tone, same hair. The person has ${bodyDesc}. Show their entire body from head to shoes, accurately reflecting their body type and proportions. ${outfitDesc} Standing upright with arms relaxed at sides, facing the camera. Professional studio photography, soft diffused lighting, no harsh shadows, clean e-commerce product style.`;

    // FLUX.1-Kontext-dev accepts image + text prompt via /images/edits (multipart form)
    const formData = new FormData();
    formData.append('model', 'black-forest-labs/FLUX.1-Kontext-dev');
    formData.append('prompt', prompt);
    formData.append('n', '1');
    formData.append('size', '768x1024');

    // React Native FormData: pass file-like object for the reference image
    formData.append('image', {
        uri: `data:image/jpeg;base64,${imageBase64}`,
        type: 'image/jpeg',
        name: 'selfie.jpg',
    } as unknown as Blob);

    const response = await fetch(`${DEEPINFRA_BASE}/images/edits`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${getApiKey()}`,
        },
        body: formData,
    });

    if (!response.ok) {
        const errText = await response.text().catch(() => '');
        throw new Error(`FLUX Kontext API error: ${response.status} ${errText}`);
    }

    const data = await response.json();
    const b64 = data.data?.[0]?.b64_json;
    if (!b64) throw new Error('No image data in response');
    return b64;
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
 * Generate a digital twin:
 * 1. Read selfie (and optional body photo) as base64
 * 2. Analyze selfie with vision model for text profile + style tips
 * 3. Use FLUX.1-Kontext-dev to transform the photo into a full-body image
 *    on a white background, preserving the person's face and identity
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

    let base64Body: string | null = null;
    if (bodyPhotoUri) {
        base64Body = await FileSystem.readAsStringAsync(bodyPhotoUri, {
            encoding: FileSystem.EncodingType.Base64,
        });
    }

    // Step 1: Analyze selfie to get body type + appearance description
    const appearance = await describeAppearance(base64Selfie, skinColor, hairColor, additionalDetails);

    // Step 2: Generate full-body image using body type from analysis
    // Use body photo as reference if available (already full-body), otherwise selfie
    const imageB64 = await generateTwinImage(
        base64Body ?? base64Selfie,
        appearance.body_type,
        additionalDetails,
    );

    const twinImageUrl = await saveBase64Image(imageB64);

    return {
        ai_description: appearance.description,
        body_type: appearance.body_type,
        style_recommendations: appearance.style_tips,
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
 * Step 2: Regenerate a clean product image using FLUX.1-Kontext-dev.
 * Takes the original photo and transforms it into a clean product shot
 * on a white background, like an e-commerce listing.
 */
export async function regenerateCleanImage(
    imageUri: string,
    product: ProductIdentification,
): Promise<string> {
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
    });

    const colorStr = product.colors.join(' and ');
    const materialStr = product.material ? `, ${product.material}` : '';
    const brandStr = product.brand ? `${product.brand} ` : '';

    const prompt = `Transform this into a clean e-commerce product photograph. Show ONLY the ${brandStr}${product.description || product.name} — a ${colorStr}${materialStr} ${product.garment_type || product.category}. Remove all backgrounds, people, and distractions. Place the item flat-lay or floating on a pure seamless white background. Professional product photography, studio lighting, sharp detail, no wrinkles, no mannequin, clean isolated product shot like on a shopping website.`;

    const formData = new FormData();
    formData.append('model', 'black-forest-labs/FLUX.1-Kontext-dev');
    formData.append('prompt', prompt);
    formData.append('n', '1');
    formData.append('size', '768x768');

    formData.append('image', {
        uri: `data:image/jpeg;base64,${base64}`,
        type: 'image/jpeg',
        name: 'product.jpg',
    } as unknown as Blob);

    const response = await fetch(`${DEEPINFRA_BASE}/images/edits`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${getApiKey()}`,
        },
        body: formData,
    });

    if (!response.ok) {
        const errText = await response.text().catch(() => '');
        throw new Error(`FLUX product regen error: ${response.status} ${errText}`);
    }

    const data = await response.json();
    const b64 = data.data?.[0]?.b64_json;
    if (!b64) throw new Error('No image data in response');

    // Save to local filesystem
    const fileName = `clean_${Date.now()}.jpg`;
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;
    await FileSystem.writeAsStringAsync(fileUri, b64, {
        encoding: FileSystem.EncodingType.Base64,
    });
    return fileUri;
}
