import * as FileSystem from 'expo-file-system/legacy';

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
        const token = process.env.EXPO_PUBLIC_DEEPINFRA_KEY;
        if (!token) return { success: false, error: 'Missing EXPO_PUBLIC_DEEPINFRA_KEY' };

        const base64 = await FileSystem.readAsStringAsync(imageUri, {
            encoding: FileSystem.EncodingType.Base64,
        });

        const response = await fetch('https://api.deepinfra.com/v1/inference/briaai/RMBG-2.0', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ image: `data:image/jpeg;base64,${base64}` }),
        });

        if (!response.ok) {
            return { success: false, error: `DeepInfra RMBG error (${response.status})` };
        }

        const result = await response.json();
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
