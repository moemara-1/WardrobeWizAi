import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from './supabase';

const BUCKET = 'wardrobe-images';

/**
 * Upload a local image to Supabase Storage and return the public URL.
 * Images are stored under the user's folder: {userId}/{filename}
 */
export async function uploadImage(
  localUri: string,
  userId: string,
  prefix: string = 'item',
): Promise<string> {
  const base64 = await FileSystem.readAsStringAsync(localUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const ext = localUri.split('.').pop()?.toLowerCase() || 'jpg';
  const fileName = `${prefix}_${Date.now()}.${ext}`;
  const filePath = `${userId}/${fileName}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, decode(base64), {
      contentType: `image/${ext === 'png' ? 'png' : 'jpeg'}`,
      upsert: false,
    });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data: urlData } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(filePath);

  return urlData.publicUrl;
}

/**
 * Upload a base64 string (no file URI) to storage.
 * Used for AI-generated images (twin, clean product shots).
 */
export async function uploadBase64Image(
  base64: string,
  userId: string,
  prefix: string = 'generated',
): Promise<string> {
  const fileName = `${prefix}_${Date.now()}.jpg`;
  const filePath = `${userId}/${fileName}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, decode(base64), {
      contentType: 'image/jpeg',
      upsert: false,
    });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data: urlData } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(filePath);

  return urlData.publicUrl;
}

/**
 * Save a temporary file (from ImagePicker/Manipulator) to the app's permanent document directory.
 * Returns the new permanent URI.
 */
export async function saveToPermanentStorage(tempUri: string): Promise<string> {
  // If already in document directory or remote, return as is
  if (!tempUri || tempUri.startsWith('http') || (FileSystem.documentDirectory && tempUri.includes(FileSystem.documentDirectory))) {
    return tempUri;
  }

  const filename = tempUri.split('/').pop() || `file_${Date.now()}`;
  // Ensure unique name
  const uniqueName = `${Date.now()}_${filename}`;
  const dest = `${FileSystem.documentDirectory}${uniqueName}`;

  try {
    await FileSystem.copyAsync({ from: tempUri, to: dest });
    if (__DEV__) console.log(`[Persistence] Saved to permanent: ${dest}`);
    return dest;
  } catch (e) {
    console.warn('[Persistence] Failed to save to permanent storage:', e);
    return tempUri; // Fallback to temp
  }
}

