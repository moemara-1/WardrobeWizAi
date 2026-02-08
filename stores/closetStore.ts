import { ClosetItem, ClothingCategory, Outfit } from '@/types';
import { create } from 'zustand';

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

    setSearchQuery: (query: string) => void;
    setCategoryFilter: (category: ClothingCategory | null) => void;
    setColorFilter: (color: string | null) => void;

    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    clearFilters: () => void;
}

export const useClosetStore = create<ClosetState>((set, get) => ({
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
}));

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
