import * as ExpoFileSystem from 'expo-file-system/legacy';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

const getApiKey = () => {
    const key = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
    if (!key) {
        console.warn('[Gemini] API key not configured');
        return null;
    }
    return key;
};

export interface ClothingDetection {
    name: string;
    category: 'top' | 'bottom' | 'outerwear' | 'dress' | 'shoe' | 'accessory' | 'bag' | 'hat' | 'jewelry' | 'other';
    brand?: string;
    brandConfidence: number;
    modelName?: string;
    estimatedValue?: number;
    colors: string[];
    confidence: number;
}

export interface OutfitAnalysisResult {
    detections: ClothingDetection[];
    overallStyle?: string;
    occasion?: string;
    processingTimeMs: number;
}

/**
 * Analyze an outfit image to detect clothing items with brand/model info
 */
export async function analyzeOutfit(imageUri: string): Promise<OutfitAnalysisResult> {
    const apiKey = getApiKey();
    if (!apiKey) {
        throw new Error('Gemini API key not configured');
    }

    const startTime = Date.now();

    // Convert image to base64
    const base64 = await ExpoFileSystem.readAsStringAsync(imageUri, {
        encoding: ExpoFileSystem.EncodingType.Base64,
    });

    const prompt = `Analyze this outfit image and identify each clothing item visible.

For EACH clothing piece, provide:
1. Name/description
2. Category (top, bottom, outerwear, dress, shoe, accessory, bag, hat, jewelry, other)
3. Brand guess (be specific - e.g., "Nike Air Force 1", "Levi's 501", "Adidas Originals")
4. How confident you are about the brand (0-1)
5. Specific model name if identifiable
6. Estimated retail value in USD
7. Main colors (as hex codes)
8. Overall confidence in the detection (0-1)

Also identify:
- Overall style (streetwear, casual, formal, sporty, etc.)
- Suggested occasion (everyday, work, date night, gym, etc.)

Respond in valid JSON format:
{
  "detections": [
    {
      "name": "Air Force 1 Low",
      "category": "shoe",
      "brand": "Nike",
      "brandConfidence": 0.95,
      "modelName": "Air Force 1 '07",
      "estimatedValue": 110,
      "colors": ["#FFFFFF"],
      "confidence": 0.98
    }
  ],
  "overallStyle": "streetwear",
  "occasion": "casual"
}`;

    try {
        const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            { text: prompt },
                            {
                                inline_data: {
                                    mime_type: 'image/jpeg',
                                    data: base64,
                                },
                            },
                        ],
                    },
                ],
                generationConfig: {
                    temperature: 0.4,
                    maxOutputTokens: 2048,
                },
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('[Gemini] API error:', error);
            throw new Error(`Gemini API error: ${response.status}`);
        }

        const data = await response.json();
        const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

        // Parse JSON from response
        const jsonMatch = textContent.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Failed to parse Gemini response');
        }

        const parsed = JSON.parse(jsonMatch[0]);

        return {
            detections: parsed.detections || [],
            overallStyle: parsed.overallStyle,
            occasion: parsed.occasion,
            processingTimeMs: Date.now() - startTime,
        };
    } catch (error) {
        console.error('[Gemini] Analysis error:', error);
        throw error;
    }
}

/**
 * Analyze a single clothing item and get detailed info via web knowledge
 */
export async function identifyClothingItem(imageUri: string): Promise<ClothingDetection & { productUrl?: string; description?: string }> {
    const apiKey = getApiKey();
    if (!apiKey) {
        throw new Error('Gemini API key not configured');
    }

    const base64 = await ExpoFileSystem.readAsStringAsync(imageUri, {
        encoding: ExpoFileSystem.EncodingType.Base64,
    });

    const prompt = `Identify this clothing item in detail.

Provide:
1. Exact name/description
2. Category
3. Brand (be as specific as possible)
4. Confidence in brand identification (0-1)
5. Specific model/product name if known
6. Estimated retail value in USD
7. Main colors as hex codes
8. A brief description
9. If you can identify the exact product, provide info that could help find it online

Respond in valid JSON:
{
  "name": "Trucker Jacket",
  "category": "outerwear", 
  "brand": "Levi's",
  "brandConfidence": 0.92,
  "modelName": "Type III Trucker",
  "estimatedValue": 98,
  "colors": ["#1E3A5F"],
  "confidence": 0.95,
  "description": "Classic denim trucker jacket with button closure",
  "searchTerms": "Levi's Type III Trucker Jacket denim"
}`;

    try {
        const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: prompt },
                        { inline_data: { mime_type: 'image/jpeg', data: base64 } },
                    ],
                }],
                generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
            }),
        });

        if (!response.ok) {
            throw new Error(`Gemini API error: ${response.status}`);
        }

        const data = await response.json();
        const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const jsonMatch = textContent.match(/\{[\s\S]*\}/);

        if (!jsonMatch) {
            throw new Error('Failed to parse response');
        }

        return JSON.parse(jsonMatch[0]);
    } catch (error) {
        console.error('[Gemini] Item identification error:', error);
        throw error;
    }
}

/**
 * Generate a description prompt for background removal/clean image
 */
export async function generateCleanProductImage(imageUri: string): Promise<string> {
    // Note: For actual background removal, we'd use a service like remove.bg
    // or Gemini's image editing capabilities when available
    // For now, return the original URI and flag for future enhancement
    console.log('[Gemini] Background removal requested - feature pending');
    return imageUri;
}
