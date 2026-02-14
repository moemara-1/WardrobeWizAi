import { supabase } from '@/lib/supabase';
import { ClosetItem, ClothingCategory, DigitalTwin, Outfit, SavedFit, UserPost, UserProfileData } from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/** Generate a unique ID using timestamp + random suffix to avoid collisions */
export function generateId(prefix: string = 'item'): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}_${timestamp}_${random}`;
}


interface ClosetState {
    // Auth
    userId: string | null;

    // Items
    items: ClosetItem[];
    selectedItem: ClosetItem | null;
    isLoading: boolean;
    error: string | null;

    // Filters
    searchQuery: string;
    categoryFilter: ClothingCategory | null;
    colorFilter: string | null;

    // Outfits
    outfits: Outfit[];
    selectedOutfit: Outfit | null;

    // Digital Twin
    digitalTwin: DigitalTwin | null;
    twinGenerating: boolean;
    twinProgress: string | null;

    // Saved Fits
    savedFits: SavedFit[];

    // Canvas pass-through (item detail -> stylist)
    canvasItem: { slot: string; item: ClosetItem } | null;
    setCanvasItem: (slot: string, item: ClosetItem) => void;
    clearCanvasItem: () => void;
    canvasOutfit: Outfit | null;
    setCanvasOutfit: (outfit: Outfit) => void;
    clearCanvasOutfit: () => void;

    // Actions
    setUserId: (id: string | null) => void;
    setItems: (items: ClosetItem[]) => void;
    addItem: (item: ClosetItem) => void;
    updateItem: (id: string, updates: Partial<ClosetItem>) => void;
    deleteItem: (id: string) => void;
    selectItem: (item: ClosetItem | null) => void;

    setOutfits: (outfits: Outfit[]) => void;
    addOutfit: (outfit: Outfit) => void;
    deleteOutfit: (id: string) => void;
    selectOutfit: (outfit: Outfit | null) => void;

    setDigitalTwin: (twin: DigitalTwin) => void;
    clearDigitalTwin: () => void;
    setTwinGenerating: (generating: boolean) => void;
    setTwinProgress: (progress: string | null) => void;

    setSearchQuery: (query: string) => void;
    setCategoryFilter: (category: ClothingCategory | null) => void;
    setColorFilter: (color: string | null) => void;

    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    clearFilters: () => void;

    addSavedFit: (fit: SavedFit) => void;
    deleteSavedFit: (id: string) => void;

    // Posts
    posts: UserPost[];
    addPost: (post: UserPost) => void;
    deletePost: (id: string) => void;

    // User Profile
    userProfile: UserProfileData;
    updateUserProfile: (updates: Partial<UserProfileData>) => void;
}

// ─── Supabase Sync (fire-and-forget, offline-first) ───

const syncToSupabase = {
    async upsertItem(item: ClosetItem, userId: string) {
        try {
            await supabase.from('items').upsert({
                id: item.id,
                user_id: userId,
                name: item.name,
                category: item.category,
                brand: item.brand || null,
                colors: item.colors,
                image_url: item.image_url || null,
                clean_image_url: item.clean_image_url || null,
                garment_type: item.garment_type || null,
                layer_type: item.layer_type || null,
                tags: item.tags,
                estimated_value: item.estimated_value || null,
                model_name: item.model_name || null,
                subcategory: item.subcategory || null,
                times_worn: item.wear_count ?? 0,
                last_worn_at: item.last_worn || null,
                created_at: item.created_at,
                updated_at: item.updated_at || new Date().toISOString(),
            });
        } catch (e) {
            if (__DEV__) console.warn('Sync upsertItem failed:', e);
        }
    },

    async deleteItem(id: string) {
        try {
            await supabase.from('items').delete().eq('id', id);
        } catch (e) {
            if (__DEV__) console.warn('Sync deleteItem failed:', e);
        }
    },

    async upsertOutfit(outfit: Outfit, userId: string) {
        try {
            await supabase.from('outfits').upsert({
                id: outfit.id,
                user_id: userId,
                name: outfit.name,
                item_ids: outfit.item_ids,
                occasion: outfit.occasion || null,
                style: outfit.theme || null,
                notes: outfit.ai_notes || null,
                image_url: outfit.collage_url || null,
                created_at: outfit.created_at,
            });
        } catch (e) {
            if (__DEV__) console.warn('Sync upsertOutfit failed:', e);
        }
    },

    async deleteOutfit(id: string) {
        try {
            await supabase.from('outfits').delete().eq('id', id);
        } catch (e) {
            if (__DEV__) console.warn('Sync deleteOutfit failed:', e);
        }
    },

    async upsertDigitalTwin(twin: DigitalTwin, userId: string) {
        try {
            await supabase.from('digital_twins').upsert({
                id: twin.id || `twin_${userId}`,
                user_id: userId,
                selfie_url: twin.selfie_url || '',
                body_url: twin.body_url || null,
                twin_image_url: twin.twin_image_url,
                skin_color: twin.skin_color || null,
                hair_color: twin.hair_color || null,
                additional_details: twin.additional_details || null,
                ai_description: twin.ai_description || null,
                body_type: twin.body_type || null,
                style_recommendations: twin.style_recommendations || null,
            });
        } catch (e) {
            if (__DEV__) console.warn('Sync upsertTwin failed:', e);
        }
    },

    async upsertProfile(profile: UserProfileData, userId: string) {
        try {
            await supabase.from('profiles').upsert({
                id: userId,
                username: profile.username,
                bio: profile.bio || null,
                avatar_url: profile.pfp_url || null,
                updated_at: new Date().toISOString(),
            });
        } catch (e) {
            if (__DEV__) console.warn('Sync upsertProfile failed:', e);
        }
    },
};

export const useClosetStore = create<ClosetState>()(
    persist(
        (set, get) => ({
            // Initial state
            userId: null,
            items: [],
            selectedItem: null,
            isLoading: false,
            error: null,
            searchQuery: '',
            categoryFilter: null,
            colorFilter: null,
            outfits: [],
            selectedOutfit: null,
            digitalTwin: null,
            twinGenerating: false,
            twinProgress: null,
            canvasItem: null,
            canvasOutfit: null,
            savedFits: [],
            posts: [],
            userProfile: { username: 'User', bio: '', pfp_url: undefined, followers: 0, following: 0 },

            // Auth actions
            setUserId: (id) => set({ userId: id }),

            // Item actions
            setItems: (items) => set({ items }),

            addItem: (item) => {
                set((state) => ({ items: [item, ...state.items] }));
                const userId = get().userId;
                if (userId) syncToSupabase.upsertItem(item, userId);
            },

            updateItem: (id, updates) => {
                set((state) => ({
                    items: state.items.map((item) =>
                        item.id === id ? { ...item, ...updates, updated_at: new Date().toISOString() } : item
                    ),
                    selectedItem: state.selectedItem?.id === id
                        ? { ...state.selectedItem, ...updates }
                        : state.selectedItem,
                }));
                const state = get();
                const userId = state.userId;
                const updated = state.items.find(i => i.id === id);
                if (userId && updated) syncToSupabase.upsertItem(updated, userId);
            },

            deleteItem: (id) => {
                set((state) => ({
                    items: state.items.filter((item) => item.id !== id),
                    selectedItem: state.selectedItem?.id === id ? null : state.selectedItem,
                }));
                const userId = get().userId;
                if (userId) syncToSupabase.deleteItem(id);
            },

            selectItem: (item) => set({ selectedItem: item }),

            // Outfit actions
            setOutfits: (outfits) => set({ outfits }),

            addOutfit: (outfit) => {
                set((state) => ({ outfits: [outfit, ...state.outfits] }));
                const userId = get().userId;
                if (userId) syncToSupabase.upsertOutfit(outfit, userId);
            },

            deleteOutfit: (id) => {
                set((state) => ({
                    outfits: state.outfits.filter((outfit) => outfit.id !== id),
                }));
                const userId = get().userId;
                if (userId) syncToSupabase.deleteOutfit(id);
            },

            selectOutfit: (outfit) => set({ selectedOutfit: outfit }),

            // Digital Twin actions
            setDigitalTwin: (twin) => {
                set({ digitalTwin: twin });
                const userId = get().userId;
                if (userId) syncToSupabase.upsertDigitalTwin(twin, userId);
            },
            clearDigitalTwin: () => set({ digitalTwin: null }),
            setTwinGenerating: (generating) => set({ twinGenerating: generating }),
            setTwinProgress: (progress) => set({ twinProgress: progress }),

            // Canvas pass-through
            setCanvasItem: (slot, item) => set({ canvasItem: { slot, item } }),
            clearCanvasItem: () => set({ canvasItem: null }),
            setCanvasOutfit: (outfit) => set({ canvasOutfit: outfit }),
            clearCanvasOutfit: () => set({ canvasOutfit: null }),

            // Filter actions
            setSearchQuery: (query) => set({ searchQuery: query }),
            setCategoryFilter: (category) => set({ categoryFilter: category }),
            setColorFilter: (color) => set({ colorFilter: color }),

            clearFilters: () => set({
                searchQuery: '',
                categoryFilter: null,
                colorFilter: null
            }),

            setLoading: (loading) => set({ isLoading: loading }),
            setError: (error) => set({ error }),

            // Saved Fits
            addSavedFit: (fit) => set((state) => ({ savedFits: [fit, ...state.savedFits] })),
            deleteSavedFit: (id) => set((state) => ({ savedFits: state.savedFits.filter((f) => f.id !== id) })),

            // Posts
            addPost: (post) => set((state) => ({ posts: [post, ...state.posts] })),
            deletePost: (id) => set((state) => ({ posts: state.posts.filter((p) => p.id !== id) })),

            // User Profile
            updateUserProfile: (updates) => {
                set((state) => {
                    const newProfile = { ...state.userProfile, ...updates };
                    const userId = get().userId;
                    if (userId) syncToSupabase.upsertProfile(newProfile, userId);
                    return { userProfile: newProfile };
                });
            },
        }),
        {
            name: 'closet-storage',
            version: 1,
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({
                items: state.items,
                outfits: state.outfits,
                digitalTwin: state.digitalTwin,
                savedFits: state.savedFits,
                posts: state.posts,
                userProfile: state.userProfile,
            }),
            migrate: (persisted: unknown, _version: number) => {
                // Future migrations go here
                // if (_version === 0) { /* migrate v0 → v1 */ }
                return persisted as Partial<ClosetState>;
            },
        },
    ),
);

// ─── Hydrate from Supabase ───

export async function hydrateFromSupabase(userId: string): Promise<void> {
    try {
        const [itemsRes, outfitsRes, twinRes, profileRes] = await Promise.all([
            supabase.from('items').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
            supabase.from('outfits').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
            supabase.from('digital_twins').select('*').eq('user_id', userId).single(),
            supabase.from('profiles').select('*').eq('id', userId).single(),
        ]);

        const store = useClosetStore.getState();

        if (itemsRes.data?.length) {
            const items: ClosetItem[] = itemsRes.data.map((row: any) => ({
                id: row.id,
                user_id: row.user_id,
                name: row.name,
                category: row.category,
                brand: row.brand,
                colors: row.colors || [],
                image_url: row.image_url,
                clean_image_url: row.clean_image_url,
                garment_type: row.garment_type,
                layer_type: row.layer_type,
                tags: row.tags || [],
                estimated_value: row.estimated_value ? Number(row.estimated_value) : undefined,
                model_name: row.model_name,
                subcategory: row.subcategory,
                detected_confidence: 1,
                wear_count: row.times_worn ?? 0,
                last_worn: row.last_worn_at,
                favorite: false,
                created_at: row.created_at,
                updated_at: row.updated_at,
            }));
            store.setItems(items);
        }

        if (outfitsRes.data?.length) {
            const outfits: Outfit[] = outfitsRes.data.map((row: any) => ({
                id: row.id,
                user_id: row.user_id,
                name: row.name,
                items: [],
                item_ids: row.item_ids || [],
                occasion: row.occasion,
                theme: row.style,
                ai_notes: row.notes,
                collage_url: row.image_url,
                seasons: [],
                pinned: false,
                created_at: row.created_at,
            }));
            store.setOutfits(outfits);
        }

        if (twinRes.data) {
            const row = twinRes.data as any;
            // Preserve the local selfie_url if DB doesn't have it
            // (selfie may be a local file URI stored only in zustand persist)
            const existingTwin = store.digitalTwin;
            store.setDigitalTwin({
                id: row.id,
                user_id: row.user_id,
                selfie_url: row.selfie_url || existingTwin?.selfie_url || '',
                body_url: row.body_url || existingTwin?.body_url,
                skin_color: row.skin_color || existingTwin?.skin_color || '',
                hair_color: row.hair_color || existingTwin?.hair_color || '',
                additional_details: row.additional_details,
                ai_description: row.ai_description || '',
                body_type: row.body_type,
                style_recommendations: row.style_recommendations,
                twin_image_url: row.twin_image_url || row.image_url || existingTwin?.twin_image_url || '',
                created_at: row.created_at,
                updated_at: row.updated_at,
            });
        }

        if (profileRes.data) {
            const row = profileRes.data as any;
            store.updateUserProfile({
                username: row.username || 'User',
                bio: row.bio || '',
                pfp_url: row.avatar_url || undefined,
            });
        }
    } catch (e) {
        if (__DEV__) console.warn('hydrateFromSupabase failed:', e);
    }
}

// Selectors
export const useFilteredItems = () => {
    const { items, searchQuery, categoryFilter, colorFilter } = useClosetStore();

    return items.filter((item) => {
        const matchesSearch = !searchQuery ||
            item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesCategory = !categoryFilter || item.category === categoryFilter;

        const matchesColor = !colorFilter ||
            item.colors.some(c => c.toLowerCase().includes(colorFilter.toLowerCase()));

        return matchesSearch && matchesCategory && matchesColor;
    });
};
