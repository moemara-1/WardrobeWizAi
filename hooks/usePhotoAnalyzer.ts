import { analyzeOutfit } from '@/lib/gemini';
import { AnalysisResult, ClosetItem, ClothingCategory, Detection } from '@/types';
import * as ImageManipulator from 'expo-image-manipulator';
import { useCallback, useState } from 'react';

// API4AI fashion endpoint with authentication
const API4AI_ENDPOINT = 'https://api4.ai/apis/fashion/v1/results';
const API4AI_DEMO_ENDPOINT = 'https://demo.api4.ai/fashion/v1/results';

const getApi4AiKey = () => process.env.EXPO_PUBLIC_API4AI_KEY || '';

interface AnalyzeOptions {
    useCloudFallback?: boolean;
    useMockOnError?: boolean;
}

interface EnhancedAnalysisResult extends AnalysisResult {
    brandDetections?: {
        name: string;
        brand?: string;
        brandConfidence: number;
        modelName?: string;
        estimatedValue?: number;
        colors: string[];
    }[];
    overallStyle?: string;
    occasion?: string;
}

// Helper to wait with exponential backoff
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Retry wrapper for API calls with rate limit handling
async function withRetry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));

            if (lastError.message.includes('429') || lastError.message.includes('rate')) {
                const delay = baseDelay * Math.pow(2, attempt);
                await wait(delay);
                continue;
            }

            if (lastError.message.includes('Network request failed')) {
                const delay = baseDelay * Math.pow(2, attempt);
                await wait(delay);
                continue;
            }

            throw lastError;
        }
    }

    throw lastError || new Error('Max retries exceeded');
}

// Mock data for when APIs are unavailable
const createMockDetections = (): Detection[] => {
    return [
        {
            id: `det-mock-${Date.now()}-1`,
            bounding_box: { x: 0, y: 0, width: 100, height: 100 },
            category: 'top' as ClothingCategory,
            confidence: 0.85,
            suggested_name: 'Casual Top',
            colors: ['#2C3E50', '#34495E'],
            brand_guess: 'Unknown',
        },
    ];
};

// Estimate brand/model from API4AI class names
function enrichDetection(className: string, confidence: number): {
    brand?: string;
    brandConfidence: number;
    modelName?: string;
    estimatedValue?: number;
} {
    const knownBrands: Record<string, { brand: string; value: number }> = {
        'sneakers': { brand: 'Nike', value: 120 },
        'boots': { brand: 'Dr. Martens', value: 170 },
        'jeans': { brand: "Levi's", value: 80 },
        'jacket': { brand: 'Zara', value: 90 },
        'coat': { brand: 'H&M', value: 120 },
        'dress': { brand: 'Zara', value: 70 },
        'hoodie': { brand: 'Nike', value: 65 },
        't-shirt': { brand: 'Uniqlo', value: 20 },
        'shirt': { brand: 'Ralph Lauren', value: 90 },
    };

    const lower = className.toLowerCase();
    const match = Object.entries(knownBrands).find(([key]) => lower.includes(key));

    if (match) {
        return {
            brand: match[1].brand,
            brandConfidence: confidence * 0.6,
            estimatedValue: match[1].value,
        };
    }

    return { brandConfidence: 0 };
}

export function usePhotoAnalyzer() {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [detections, setDetections] = useState<Detection[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);

    const preprocessImage = async (uri: string): Promise<string> => {
        const result = await ImageManipulator.manipulateAsync(
            uri,
            [{ resize: { width: 1024 } }],
            { format: ImageManipulator.SaveFormat.JPEG, compress: 0.85 }
        );
        return result.uri;
    };

    /**
     * Analyze with API4AI Fashion endpoint — tries authenticated then demo
     */
    const analyzeWithApi4AI = async (imageUri: string): Promise<Detection[]> => {
        const apiKey = getApi4AiKey();

        const formData = new FormData();
        formData.append('image', {
            uri: imageUri,
            type: 'image/jpeg',
            name: 'photo.jpg',
        } as any);

        // Try authenticated endpoint first, fallback to demo
        const endpoints: { url: string; headers: Record<string, string> }[] = apiKey
            ? [
                { url: API4AI_ENDPOINT, headers: { 'Accept': 'application/json', 'X-API-Key': apiKey } },
                { url: API4AI_DEMO_ENDPOINT, headers: { 'Accept': 'application/json' } },
            ]
            : [
                { url: API4AI_DEMO_ENDPOINT, headers: { 'Accept': 'application/json' } },
            ];

        let lastError: Error | null = null;

        for (const endpoint of endpoints) {
            try {
                const response = await fetch(endpoint.url, {
                    method: 'POST',
                    body: formData,
                    headers: endpoint.headers,
                });

                if (!response.ok) {
                    throw new Error(`API4AI error: ${response.status}`);
                }

                const data = await response.json();
                const detections: Detection[] = [];

                if (data.results?.[0]?.entities) {
                    for (const entity of data.results[0].entities) {
                        const className = entity.classes?.[0]?.class_name || 'Unknown Item';
                        const conf = entity.classes?.[0]?.confidence || 0.5;
                        const enrichment = enrichDetection(className, conf);

                        detections.push({
                            id: `det-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                            bounding_box: {
                                x: entity.box?.x || 0,
                                y: entity.box?.y || 0,
                                width: entity.box?.w || 100,
                                height: entity.box?.h || 100,
                            },
                            category: mapCategoryFromApi4AI(className),
                            confidence: conf,
                            suggested_name: className,
                            colors: entity.colors || [],
                            brand_guess: enrichment.brand,
                        });
                    }
                }

                if (detections.length > 0) {
                    return detections;
                }
            } catch (err) {
                lastError = err instanceof Error ? err : new Error(String(err));
            }
        }

        throw lastError || new Error('API4AI: No detections');
    };

    const analyzeWithGemini = async (imageUri: string): Promise<Detection[]> => {
        const result = await analyzeOutfit(imageUri);
        return result.detections.map((det, i) => ({
            id: `det-${Date.now()}-${i}`,
            bounding_box: { x: 0, y: 0, width: 100, height: 100 },
            category: det.category,
            confidence: det.confidence,
            suggested_name: det.name,
            colors: det.colors,
            brand_guess: det.brand,
        }));
    };

    const analyze = useCallback(async (
        imageUri: string,
        options: AnalyzeOptions = {}
    ): Promise<EnhancedAnalysisResult> => {
        const { useMockOnError = true } = options;

        setIsAnalyzing(true);
        setError(null);
        setProgress(0);

        const startTime = Date.now();

        try {
            setProgress(0.1);
            const processedUri = await preprocessImage(imageUri);

            setProgress(0.3);
            let results: Detection[] = [];
            let modelUsed: 'ml_kit' | 'api4ai' | 'openai' | 'gemini' | 'mock' = 'gemini';

            try {
                results = await withRetry(() => analyzeWithGemini(processedUri), 2, 2000);
                setProgress(0.8);
            } catch {
                // Gemini failed — fall back to API4AI
            }

            if (results.length === 0) {
                try {
                    results = await withRetry(() => analyzeWithApi4AI(processedUri), 2, 2000);
                    modelUsed = 'api4ai';
                    setProgress(0.8);
                } catch {
                    // API4AI also failed
                }
            }

            if (results.length === 0 && useMockOnError) {
                results = createMockDetections();
                modelUsed = 'mock';
                setError('AI services temporarily unavailable — using placeholder data');
            }

            if (results.length === 0) {
                throw new Error('All analysis services unavailable');
            }

            setProgress(1);
            setDetections(results);

            return {
                detections: results,
                processing_time_ms: Date.now() - startTime,
                model_used: modelUsed,
            };
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Analysis failed';
            setError(message);
            throw err;
        } finally {
            setIsAnalyzing(false);
        }
    }, []);

    /**
     * Analyze a single item for detailed brand/value info
     */
    const analyzeItem = useCallback(async (imageUri: string): Promise<Partial<ClosetItem>> => {
        setIsAnalyzing(true);
        setError(null);

        try {
            const processedUri = await preprocessImage(imageUri);
            const results = await withRetry(() => analyzeWithApi4AI(processedUri), 3, 2000);

            if (results.length > 0) {
                const item = results[0];
                const enrichment = enrichDetection(item.suggested_name || '', item.confidence);

                return {
                    name: item.suggested_name || 'Clothing Item',
                    category: item.category,
                    brand: item.brand_guess || enrichment.brand,
                    brand_confidence: enrichment.brandConfidence,
                    model_name: enrichment.modelName,
                    estimated_value: enrichment.estimatedValue,
                    colors: item.colors || ['#333333'],
                    detected_confidence: item.confidence,
                };
            }

            return {
                name: 'Clothing Item',
                category: 'other' as ClothingCategory,
                colors: ['#333333'],
                detected_confidence: 0.5,
            };
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Item analysis failed';
            setError(message);

            return {
                name: 'Clothing Item',
                category: 'other' as ClothingCategory,
                colors: ['#333333'],
                detected_confidence: 0.5,
            };
        } finally {
            setIsAnalyzing(false);
        }
    }, []);

    const clearDetections = useCallback(() => {
        setDetections([]);
        setError(null);
        setProgress(0);
    }, []);

    return {
        analyze,
        analyzeItem,
        isAnalyzing,
        detections,
        error,
        progress,
        clearDetections,
    };
}

// Helper functions
function mapCategoryFromApi4AI(apiCategory: string): ClothingCategory {
    const mapping: Record<string, ClothingCategory> = {
        'shirt': 'top',
        't-shirt': 'top',
        'blouse': 'top',
        'sweater': 'top',
        'hoodie': 'top',
        'top': 'top',
        'pants': 'bottom',
        'jeans': 'bottom',
        'shorts': 'bottom',
        'trousers': 'bottom',
        'skirt': 'bottom',
        'jacket': 'outerwear',
        'coat': 'outerwear',
        'blazer': 'outerwear',
        'vest': 'outerwear',
        'dress': 'dress',
        'sneakers': 'shoe',
        'boots': 'shoe',
        'heels': 'shoe',
        'sandals': 'shoe',
        'shoes': 'shoe',
        'bag': 'bag',
        'handbag': 'bag',
        'backpack': 'bag',
        'hat': 'hat',
        'cap': 'hat',
        'beanie': 'hat',
        'watch': 'accessory',
        'sunglasses': 'accessory',
        'belt': 'accessory',
        'scarf': 'accessory',
        'necklace': 'jewelry',
        'ring': 'jewelry',
        'earrings': 'jewelry',
        'bracelet': 'jewelry',
    };

    const lower = apiCategory.toLowerCase();
    for (const [key, value] of Object.entries(mapping)) {
        if (lower.includes(key)) return value;
    }
    return 'other';
}
