import * as FileSystem from 'expo-file-system/legacy';

const REMOVEBG_API_URL = 'https://api.remove.bg/v1.0/removebg';

const getApiKey = () => {
    const key = process.env.EXPO_PUBLIC_REMOVEBG_API_KEY;
    if (!key) {
        console.warn('[RemoveBg] API key not configured');
        return null;
    }
    return key;
};

export interface BackgroundRemovalResult {
    success: boolean;
    cleanImageUri?: string;
    error?: string;
}

/**
 * Remove background from an image using remove.bg API
 * Returns a new image with white background
 */
export async function removeBackground(imageUri: string): Promise<BackgroundRemovalResult> {
    const apiKey = getApiKey();
    if (!apiKey) {
        return { success: false, error: 'Remove.bg API key not configured' };
    }

    try {
        // Read image as base64
        const base64 = await FileSystem.readAsStringAsync(imageUri, {
            encoding: FileSystem.EncodingType.Base64,
        });

        // Call remove.bg API
        const response = await fetch(REMOVEBG_API_URL, {
            method: 'POST',
            headers: {
                'X-Api-Key': apiKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                image_file_b64: base64,
                size: 'regular',
                type: 'product',
                bg_color: 'FFFFFF', // White background
                format: 'png',
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[RemoveBg] API error:', response.status, errorText);
            return { success: false, error: `API error: ${response.status}` };
        }

        // Get result as base64
        const resultBlob = await response.blob();
        const resultBase64 = await blobToBase64(resultBlob);

        // Save to local file
        const filename = `clean_${Date.now()}.png`;
        const cacheDir = FileSystem.cacheDirectory || '';
        const cleanImageUri = `${cacheDir}${filename}`;

        await FileSystem.writeAsStringAsync(cleanImageUri, resultBase64, {
            encoding: FileSystem.EncodingType.Base64,
        });

        console.log('[RemoveBg] Successfully created clean image:', cleanImageUri);
        return { success: true, cleanImageUri };
    } catch (error) {
        console.error('[RemoveBg] Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * Process multiple images and return cleaned versions
 */
export async function removeBackgroundBatch(imageUris: string[]): Promise<BackgroundRemovalResult[]> {
    const results = await Promise.all(
        imageUris.map(uri => removeBackground(uri))
    );
    return results;
}

// Helper function
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
