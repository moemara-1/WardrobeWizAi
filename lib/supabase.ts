import 'react-native-url-polyfill/dist/polyfill';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { ClosetItem, Outfit } from '@/types';

// TODO: Replace with your Supabase credentials
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});

// Closet Item CRUD
export const closetApi = {
    async getAll(): Promise<ClosetItem[]> {
        const { data, error } = await supabase
            .from('closet_items')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    async create(item: Omit<ClosetItem, 'id' | 'created_at' | 'updated_at'>): Promise<ClosetItem> {
        const { data, error } = await supabase
            .from('closet_items')
            .insert(item)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async update(id: string, updates: Partial<ClosetItem>): Promise<ClosetItem> {
        const { data, error } = await supabase
            .from('closet_items')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async delete(id: string): Promise<void> {
        const { error } = await supabase
            .from('closet_items')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    async incrementWearCount(id: string): Promise<void> {
        const { error } = await supabase.rpc('increment_wear_count', { item_id: id });
        if (error) throw error;
    },
};

// Outfit CRUD
export const outfitApi = {
    async getAll(): Promise<Outfit[]> {
        const { data, error } = await supabase
            .from('outfits')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    async create(outfit: Omit<Outfit, 'id' | 'created_at'>): Promise<Outfit> {
        const { data, error } = await supabase
            .from('outfits')
            .insert(outfit)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async delete(id: string): Promise<void> {
        const { error } = await supabase
            .from('outfits')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },
};

// Image upload
export const uploadImage = async (
    uri: string,
    bucket: string = 'closet-images'
): Promise<string> => {
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;

    const response = await fetch(uri);
    const blob = await response.blob();

    const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, blob, {
            contentType: 'image/jpeg',
            upsert: false,
        });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

    return publicUrl;
};
