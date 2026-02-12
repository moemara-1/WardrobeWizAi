import { ClosetItem, ClothingCategory, DigitalTwin, Outfit } from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface ClosetState {
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

    // Actions
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

    setSearchQuery: (query: string) => void;
    setCategoryFilter: (category: ClothingCategory | null) => void;
    setColorFilter: (color: string | null) => void;

    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    clearFilters: () => void;
}

export const useClosetStore = create<ClosetState>()(
  persist(
    (set, get) => ({
    // Initial state
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

    // Item actions
    setItems: (items) => set({ items }),

    addItem: (item) => set((state) => ({
        items: [item, ...state.items]
    })),

    updateItem: (id, updates) => set((state) => ({
        items: state.items.map((item) =>
            item.id === id ? { ...item, ...updates, updated_at: new Date().toISOString() } : item
        ),
        selectedItem: state.selectedItem?.id === id
            ? { ...state.selectedItem, ...updates }
            : state.selectedItem,
    })),

    deleteItem: (id) => set((state) => ({
        items: state.items.filter((item) => item.id !== id),
        selectedItem: state.selectedItem?.id === id ? null : state.selectedItem,
    })),

    selectItem: (item) => set({ selectedItem: item }),

    // Outfit actions
    setOutfits: (outfits) => set({ outfits }),

    addOutfit: (outfit) => set((state) => ({
        outfits: [outfit, ...state.outfits]
    })),

    deleteOutfit: (id) => set((state) => ({
        outfits: state.outfits.filter((outfit) => outfit.id !== id),
    })),

    selectOutfit: (outfit) => set({ selectedOutfit: outfit }),

    // Digital Twin actions
    setDigitalTwin: (twin) => set({ digitalTwin: twin }),
    clearDigitalTwin: () => set({ digitalTwin: null }),

    // Filter actions
    setSearchQuery: (query) => set({ searchQuery: query }),
    setCategoryFilter: (category) => set({ categoryFilter: category }),
    setColorFilter: (color) => set({ colorFilter: color }),

    clearFilters: () => set({
        searchQuery: '',
        categoryFilter: null,
        colorFilter: null
    }),

    // UI state
    setLoading: (loading) => set({ isLoading: loading }),
    setError: (error) => set({ error }),
    }),
    {
      name: 'closet-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        items: state.items,
        outfits: state.outfits,
        digitalTwin: state.digitalTwin,
      }),
    },
  ),
);

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
