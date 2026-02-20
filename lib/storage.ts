import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from './supabase';

const BUCKET = 'wardrobe-images';

/**
 * Copy a temp/cache image URI to permanent document storage so it survives cache eviction.
 * Returns the permanent URI (or the original if it's already permanent/remote).
 */
export async function saveToPermanentStorage(uri: string): Promise<string> {
  if (!uri) return uri;
  if (uri.startsWith('http')) return uri;

  const permanentDir = FileSystem.documentDirectory;
  if (!permanentDir) return uri;

  if (uri.startsWith(permanentDir)) return uri;

  try {
    const filename = `img_${Date.now()}_${Math.random().toString(36).slice(2)}.${uri.split('.').pop()?.toLowerCase() || 'jpg'}`;
    const destUri = `${permanentDir}${filename}`;
    await FileSystem.copyAsync({ from: uri, to: destUri });
    return destUri;
  } catch {
    return uri;
  }
}

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
