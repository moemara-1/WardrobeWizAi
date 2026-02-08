import { useState, useCallback } from 'react';
import * as ImageManipulator from 'expo-image-manipulator';
import { Detection, ClothingCategory, AnalysisResult } from '@/types';

// api4.ai Fashion API endpoint
const API4AI_ENDPOINT = 'https://api4.ai/api/v1/results';
const API4AI_KEY = process.env.EXPO_PUBLIC_API4AI_KEY || '';

// OpenAI for fallback/enhancement
const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY || '';

interface AnalyzeOptions {
    useCloudFallback?: boolean;
    enhanceWithAI?: boolean;
}

export function usePhotoAnalyzer() {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [detections, setDetections] = useState<Detection[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);

    const preprocessImage = async (uri: string): Promise<string> => {
        const result = await ImageManipulator.manipulateAsync(
            uri,
            [{ resize: { width: 800 } }],
            { format: ImageManipulator.SaveFormat.JPEG, compress: 0.8 }
        );
        return result.uri;
    };

    const analyzeWithApi4AI = async (imageUri: string): Promise<Detection[]> => {
        const formData = new FormData();
        formData.append('image', {
            uri: imageUri,
            type: 'image/jpeg',
            name: 'photo.jpg',
        } as any);

        const response = await fetch('https://demo.api4.ai/fashion/v1/results', {
            method: 'POST',
            body: formData,
            headers: {
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`API4AI error: ${response.status}`);
        }

        const data = await response.json();

        // Parse api4.ai response into our Detection format
        const detections: Detection[] = [];

        if (data.results?.[0]?.entities) {
            for (const entity of data.results[0].entities) {
                detections.push({
                    id: `det-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    bounding_box: {
                        x: entity.box?.x || 0,
                        y: entity.box?.y || 0,
                        width: entity.box?.w || 100,
                        height: entity.box?.h || 100,
                    },
                    category: mapCategoryFromApi4AI(entity.classes?.[0]?.class_name || 'other'),
                    confidence: entity.classes?.[0]?.confidence || 0.5,
                    suggested_name: entity.classes?.[0]?.class_name || 'Unknown Item',
                    colors: entity.colors || [],
                });
            }
        }

        return detections;
    };

    const analyzeWithOpenAI = async (imageUri: string): Promise<Detection[]> => {
        if (!OPENAI_API_KEY) {
            console.log('OpenAI API key not set, skipping AI analysis');
            return [];
        }

        // Convert image to base64
        const response = await fetch(imageUri);
        const blob = await response.blob();
        const base64 = await blobToBase64(blob);

        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'gpt-4o',
                messages: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: `Analyze this clothing image and identify all visible clothing items. For each item, provide:
                - category (top, bottom, outerwear, dress, shoe, accessory, bag, hat, jewelry)
                - suggested_name (descriptive name like "1996 Retro North Face Jacket")
                - colors (array of color names)
                - confidence (0.0 to 1.0)
                
                Return as JSON array: [{ category, suggested_name, colors, confidence }]`,
                            },
                            {
                                type: 'image_url',
                                image_url: { url: `data:image/jpeg;base64,${base64}` },
                            },
                        ],
                    },
                ],
                max_tokens: 1000,
            }),
        });

        const data = await openaiResponse.json();
        const content = data.choices?.[0]?.message?.content || '[]';

        try {
            const parsed = JSON.parse(content.replace(/```json\n?|\n?```/g, ''));
            return parsed.map((item: any, index: number) => ({
                id: `det-${Date.now()}-${index}`,
                bounding_box: { x: 0, y: 0, width: 100, height: 100 },
                category: item.category as ClothingCategory,
                confidence: item.confidence || 0.8,
                suggested_name: item.suggested_name,
                colors: item.colors || [],
            }));
        } catch {
            return [];
        }
    };

    const analyze = useCallback(async (
        imageUri: string,
        options: AnalyzeOptions = {}
    ): Promise<AnalysisResult> => {
        const { useCloudFallback = true, enhanceWithAI = false } = options;

        setIsAnalyzing(true);
        setError(null);
        setProgress(0);

        const startTime = Date.now();

        try {
            setProgress(0.1);
            const processedUri = await preprocessImage(imageUri);

            setProgress(0.3);
            let results: Detection[] = [];
            let modelUsed: 'ml_kit' | 'api4ai' | 'openai' = 'api4ai';

            // Try api4.ai first (better fashion-specific detection)
            try {
                results = await analyzeWithApi4AI(processedUri);
                setProgress(0.7);
            } catch (apiError) {
                console.warn('api4.ai failed, trying OpenAI fallback:', apiError);

                if (useCloudFallback) {
                    results = await analyzeWithOpenAI(processedUri);
                    modelUsed = 'openai';
                }
            }

            // Enhance with OpenAI if requested and we have results
            if (enhanceWithAI && results.length > 0 && OPENAI_API_KEY) {
                const enhanced = await analyzeWithOpenAI(processedUri);
                // Merge enhanced data with detection boxes
                results = mergeDetections(results, enhanced);
                modelUsed = 'openai';
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

    const clearDetections = useCallback(() => {
        setDetections([]);
        setError(null);
        setProgress(0);
    }, []);

    return {
        analyze,
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
        'pants': 'bottom',
        'jeans': 'bottom',
        'shorts': 'bottom',
        'skirt': 'bottom',
        'jacket': 'outerwear',
        'coat': 'outerwear',
        'blazer': 'outerwear',
        'dress': 'dress',
        'sneakers': 'shoe',
        'boots': 'shoe',
        'heels': 'shoe',
        'sandals': 'shoe',
        'bag': 'bag',
        'handbag': 'bag',
        'backpack': 'bag',
        'hat': 'hat',
        'cap': 'hat',
        'watch': 'accessory',
        'sunglasses': 'accessory',
        'necklace': 'jewelry',
        'ring': 'jewelry',
        'earrings': 'jewelry',
    };

    const lower = apiCategory.toLowerCase();
    return mapping[lower] || 'other';
}

function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = (reader.result as string).split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

function mergeDetections(primary: Detection[], enhanced: Detection[]): Detection[] {
    // Match enhanced names/colors to primary detections by category
    return primary.map((detection, index) => {
        const match = enhanced.find(e => e.category === detection.category);
        if (match) {
            return {
                ...detection,
                suggested_name: match.suggested_name || detection.suggested_name,
                colors: match.colors.length > 0 ? match.colors : detection.colors,
            };
        }
        return detection;
    });
}
