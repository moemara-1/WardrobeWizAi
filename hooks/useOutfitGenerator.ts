import { useState, useCallback } from 'react';
import { ClosetItem, Outfit, OutfitGenerationRequest, OutfitSuggestion, StyleProfile, Occasion } from '@/types';
import { useClosetStore } from '@/stores/closetStore';

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY || '';

export function useOutfitGenerator() {
    const [isGenerating, setIsGenerating] = useState(false);
    const [suggestions, setSuggestions] = useState<OutfitSuggestion[]>([]);
    const [error, setError] = useState<string | null>(null);

    const items = useClosetStore((state) => state.items);

    const generateOutfit = useCallback(async (
        request: OutfitGenerationRequest
    ): Promise<OutfitSuggestion[]> => {
        if (!OPENAI_API_KEY) {
            // Fallback to rule-based generation
            return generateRuleBased(items, request);
        }

        setIsGenerating(true);
        setError(null);

        try {
            const closetSummary = items.map(item => ({
                id: item.id,
                name: item.name,
                category: item.category,
                colors: item.colors,
                brand: item.brand,
            }));

            const baseItems = items.filter(i => request.base_items.includes(i.id));

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'gpt-4o',
                    messages: [
                        {
                            role: 'system',
                            content: `You are a fashion stylist AI. Given a user's closet and constraints, suggest 3 complete outfits using ONLY items from their closet. Be creative but practical.`,
                        },
                        {
                            role: 'user',
                            content: `My closet contains:
${JSON.stringify(closetSummary, null, 2)}

I want to build an outfit including these items:
${JSON.stringify(baseItems.map(i => i.name))}

Occasion: ${request.occasion || 'casual'}
Style preference: ${request.style || 'varies'}
${request.weather_temp ? `Weather: ${request.weather_temp}°F` : ''}
${request.exclude_items?.length ? `Exclude items with IDs: ${request.exclude_items.join(', ')}` : ''}

Return 3 outfit suggestions as JSON array:
[{
  "item_ids": ["id1", "id2", ...],
  "reasoning": "Why these items work together",
  "occasion": "casual|work|formal|date|sport|party",
  "style_match_score": 0.0-1.0
}]`,
                        },
                    ],
                    max_tokens: 1500,
                }),
            });

            const data = await response.json();
            const content = data.choices?.[0]?.message?.content || '[]';

            const parsed = JSON.parse(content.replace(/```json\n?|\n?```/g, ''));

            const suggestions: OutfitSuggestion[] = parsed.map((s: any) => ({
                items: items.filter(i => s.item_ids.includes(i.id)),
                reasoning: s.reasoning,
                occasion: s.occasion as Occasion,
                weather_appropriate: true,
                style_match_score: s.style_match_score || 0.8,
            }));

            setSuggestions(suggestions);
            return suggestions;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Generation failed';
            setError(message);

            // Fallback to rule-based
            return generateRuleBased(items, request);
        } finally {
            setIsGenerating(false);
        }
    }, [items]);

    const clearSuggestions = useCallback(() => {
        setSuggestions([]);
        setError(null);
    }, []);

    return {
        generateOutfit,
        isGenerating,
        suggestions,
        error,
        clearSuggestions,
    };
}

// Rule-based fallback generator
function generateRuleBased(
    items: ClosetItem[],
    request: OutfitGenerationRequest
): OutfitSuggestion[] {
    const baseItems = items.filter(i => request.base_items.includes(i.id));
    const excludeSet = new Set(request.exclude_items || []);

    const available = items.filter(i =>
        !excludeSet.has(i.id) && !request.base_items.includes(i.id)
    );

    const suggestions: OutfitSuggestion[] = [];

    // Try to build 3 complete outfits
    for (let i = 0; i < 3; i++) {
        const outfit = [...baseItems];
        const usedCategories = new Set(baseItems.map(i => i.category));
        const baseColors = baseItems.flatMap(i => i.colors);

        // Add missing essential categories
        const essentials = ['top', 'bottom', 'shoe'] as const;

        for (const cat of essentials) {
            if (!usedCategories.has(cat)) {
                // Find a matching item by color compatibility
                const candidates = available.filter(item =>
                    item.category === cat && !outfit.some(o => o.id === item.id)
                );

                // Sort by color compatibility
                candidates.sort((a, b) => {
                    const aScore = a.colors.some(c => baseColors.includes(c) || isNeutral(c)) ? 1 : 0;
                    const bScore = b.colors.some(c => baseColors.includes(c) || isNeutral(c)) ? 1 : 0;
                    return bScore - aScore;
                });

                if (candidates[i % candidates.length]) {
                    outfit.push(candidates[i % candidates.length]);
                    usedCategories.add(cat);
                }
            }
        }

        if (outfit.length > baseItems.length) {
            suggestions.push({
                items: outfit,
                reasoning: `A ${request.occasion || 'casual'} outfit combining your selected items with color-coordinated pieces.`,
                occasion: (request.occasion as Occasion) || 'casual',
                weather_appropriate: true,
                style_match_score: 0.7 + Math.random() * 0.2,
            });
        }
    }

    return suggestions;
}

function isNeutral(color: string): boolean {
    const neutrals = ['black', 'white', 'gray', 'grey', 'beige', 'navy', 'brown', 'cream', 'tan'];
    return neutrals.some(n => color.toLowerCase().includes(n));
}
