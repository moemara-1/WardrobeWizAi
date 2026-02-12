import { supabase } from './supabase';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';

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
