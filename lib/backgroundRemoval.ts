import { supabase } from '@/lib/supabase';
import * as FileSystem from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

export type GarmentSlot = 'headwear' | 'top' | 'bottom' | 'footwear' | 'accessory' | 'full-body' | 'unknown';

export interface BackgroundRemovalResult {
    success: boolean;
    cleanImageUri?: string;
    garmentSlot?: GarmentSlot;
    error?: string;
}

/**
 * Map a clothing category + garment_type to a garment slot
 */
export function classifyGarmentSlot(category: string, garmentType?: string): GarmentSlot {
    const cat = category.toLowerCase();
    const type = (garmentType || '').toLowerCase();

    // Headwear
    if (cat === 'hat' || type.includes('cap') || type.includes('beanie') || type.includes('hat') || type.includes('headband') || type.includes('turban')) {
        return 'headwear';
    }

    // Footwear
    if (cat === 'shoe' || type.includes('boot') || type.includes('sneaker') || type.includes('sandal') || type.includes('heel') || type.includes('loafer') || type.includes('slide') || type.includes('shoe')) {
        return 'footwear';
    }

    // Tops
    if (cat === 'top' || cat === 'outerwear' || type.includes('shirt') || type.includes('hoodie') || type.includes('sweater') || type.includes('jacket') || type.includes('blazer') || type.includes('vest') || type.includes('tank') || type.includes('blouse') || type.includes('coat')) {
        return 'top';
    }

    // Bottoms
    if (cat === 'bottom' || type.includes('pants') || type.includes('jeans') || type.includes('shorts') || type.includes('skirt') || type.includes('trouser') || type.includes('legging')) {
        return 'bottom';
    }

    // Full body
    if (cat === 'dress' || type.includes('dress') || type.includes('jumpsuit') || type.includes('romper') || type.includes('overalls')) {
        return 'full-body';
    }

    // Accessories
    if (cat === 'accessory' || cat === 'bag' || cat === 'jewelry' || type.includes('belt') || type.includes('scarf') || type.includes('glove') || type.includes('sunglasses') || type.includes('tie') || type.includes('watch') || type.includes('necklace') || type.includes('bracelet') || type.includes('ring') || type.includes('earring') || type.includes('bag') || type.includes('backpack') || type.includes('purse')) {
        return 'accessory';
    }

    return 'unknown';
}

export async function removeBackground(imageUri: string): Promise<BackgroundRemovalResult> {
    try {
        const resized = await manipulateAsync(
            imageUri,
            [{ resize: { width: 1024 } }],
            { format: SaveFormat.JPEG, compress: 0.8 },
        );
        const base64 = await FileSystem.readAsStringAsync(resized.uri, {
            encoding: FileSystem.EncodingType.Base64,
        });

        const { data: result, error } = await supabase.functions.invoke('ai-proxy', {
            body: {
                provider: 'deepinfra-image',
                model: 'briaai/RMBG-2.0',
                input: { image: `data:image/jpeg;base64,${base64}` },
            },
        });

        if (error) return { success: false, error: `RMBG proxy error: ${error.message}` };
        if (result?.error) return { success: false, error: `RMBG error: ${typeof result.error === 'string' ? result.error : JSON.stringify(result.error)}` };

        const resultBase64 = result.image;
        if (!resultBase64 || typeof resultBase64 !== 'string') {
            return { success: false, error: 'No image data in response' };
        }

        const raw = resultBase64.startsWith('data:') ? resultBase64.split(',')[1] : resultBase64;
        const filename = `clean_${Date.now()}.png`;
        const cacheDir = FileSystem.cacheDirectory || '';
        const cleanImageUri = `${cacheDir}${filename}`;

        await FileSystem.writeAsStringAsync(cleanImageUri, raw, {
            encoding: FileSystem.EncodingType.Base64,
        });

        return { success: true, cleanImageUri };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}
