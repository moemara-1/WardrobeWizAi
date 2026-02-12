import * as FileSystem from 'expo-file-system/legacy';

const REMOVEBG_API_URL = 'https://api.remove.bg/v1.0/removebg';

const getApiKey = () => {
    const key = process.env.EXPO_PUBLIC_REMOVEBG_API_KEY;
    if (!key) {
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
            return { success: false, error: `API error: ${response.status}` };
        }

        const resultBuffer = await response.arrayBuffer();
        const bytes = new Uint8Array(resultBuffer);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        const resultBase64 = btoa(binary);

        const filename = `clean_${Date.now()}.png`;
        const cacheDir = FileSystem.cacheDirectory || '';
        const cleanImageUri = `${cacheDir}${filename}`;

        await FileSystem.writeAsStringAsync(cleanImageUri, resultBase64, {
            encoding: FileSystem.EncodingType.Base64,
        });

        return { success: true, cleanImageUri };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

