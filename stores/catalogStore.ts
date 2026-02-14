import { ClothingCategory } from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface CatalogItem {
    id: string;
    name: string;
    brand: string | null;
    category: ClothingCategory;
    colors: string[];
    imageUrl: string | null;
    estimatedValue: number | null;
    source: 'seeded' | 'community';
}

interface CatalogState {
    items: CatalogItem[];
    addCommunityItem: (item: Omit<CatalogItem, 'id' | 'source'>) => void;
    search: (query: string) => CatalogItem[];
}

const SEEDED_CATALOG: CatalogItem[] = [
    { id: 'cat-1', name: 'Air Force 1 Low White', brand: 'Nike', category: 'shoe', colors: ['white'], imageUrl: null, estimatedValue: 110, source: 'seeded' },
    { id: 'cat-2', name: 'Samba OG Black', brand: 'Adidas', category: 'shoe', colors: ['black', 'white'], imageUrl: null, estimatedValue: 100, source: 'seeded' },
    { id: 'cat-3', name: '501 Original Fit Jeans', brand: "Levi's", category: 'bottom', colors: ['blue'], imageUrl: null, estimatedValue: 69, source: 'seeded' },
    { id: 'cat-4', name: 'Classic Polo Shirt', brand: 'Ralph Lauren', category: 'top', colors: ['navy'], imageUrl: null, estimatedValue: 98, source: 'seeded' },
    { id: 'cat-5', name: 'Nuptse 700 Puffer Jacket', brand: 'The North Face', category: 'outerwear', colors: ['black'], imageUrl: null, estimatedValue: 300, source: 'seeded' },
    { id: 'cat-6', name: 'Chuck Taylor All Star', brand: 'Converse', category: 'shoe', colors: ['white', 'black'], imageUrl: null, estimatedValue: 65, source: 'seeded' },
    { id: 'cat-7', name: 'Classic White T-Shirt', brand: 'Uniqlo', category: 'top', colors: ['white'], imageUrl: null, estimatedValue: 15, source: 'seeded' },
    { id: 'cat-8', name: 'Ultra Mini Platform Boot', brand: 'UGG', category: 'shoe', colors: ['chestnut'], imageUrl: null, estimatedValue: 160, source: 'seeded' },
    { id: 'cat-9', name: 'Oversized Blazer', brand: 'Zara', category: 'outerwear', colors: ['black'], imageUrl: null, estimatedValue: 89, source: 'seeded' },
    { id: 'cat-10', name: 'Cargo Pants', brand: 'Carhartt WIP', category: 'bottom', colors: ['khaki'], imageUrl: null, estimatedValue: 128, source: 'seeded' },
    { id: 'cat-11', name: 'New Balance 550', brand: 'New Balance', category: 'shoe', colors: ['white', 'green'], imageUrl: null, estimatedValue: 110, source: 'seeded' },
    { id: 'cat-12', name: 'Cashmere Turtleneck', brand: 'COS', category: 'top', colors: ['cream'], imageUrl: null, estimatedValue: 135, source: 'seeded' },
    { id: 'cat-13', name: 'Silk Midi Dress', brand: 'Reformation', category: 'dress', colors: ['black'], imageUrl: null, estimatedValue: 278, source: 'seeded' },
    { id: 'cat-14', name: 'Dunk Low Panda', brand: 'Nike', category: 'shoe', colors: ['black', 'white'], imageUrl: null, estimatedValue: 115, source: 'seeded' },
    { id: 'cat-15', name: 'Baguette Bag', brand: 'Fendi', category: 'bag', colors: ['brown'], imageUrl: null, estimatedValue: 2950, source: 'seeded' },
    { id: 'cat-16', name: 'Baseball Cap', brand: 'New Era', category: 'hat', colors: ['navy'], imageUrl: null, estimatedValue: 35, source: 'seeded' },
    { id: 'cat-17', name: 'Leather Belt', brand: 'Gucci', category: 'accessory', colors: ['brown'], imageUrl: null, estimatedValue: 450, source: 'seeded' },
    { id: 'cat-18', name: 'Hoodie', brand: 'Champion', category: 'top', colors: ['grey'], imageUrl: null, estimatedValue: 55, source: 'seeded' },
    { id: 'cat-19', name: 'Wide Leg Trousers', brand: 'COS', category: 'bottom', colors: ['black'], imageUrl: null, estimatedValue: 99, source: 'seeded' },
    { id: 'cat-20', name: 'Aviator Sunglasses', brand: 'Ray-Ban', category: 'accessory', colors: ['gold'], imageUrl: null, estimatedValue: 163, source: 'seeded' },
];

export const useCatalogStore = create<CatalogState>()(
    persist(
        (set, get) => ({
            items: SEEDED_CATALOG,

            addCommunityItem: (item) => {
                const existing = get().items;
                const isDuplicate = existing.some(
                    (e) => e.name.toLowerCase() === item.name.toLowerCase() && e.brand === item.brand
                );
                if (isDuplicate) return;

                set((state) => ({
                    items: [
                        ...state.items,
                        {
                            ...item,
                            id: `cat-community-${Date.now()}`,
                            source: 'community' as const,
                        },
                    ],
                }));
            },

            search: (query) => {
                const q = query.toLowerCase().trim();
                if (!q) return [];
                return get().items.filter((item) => {
                    const searchable = [
                        item.name,
                        item.brand,
                        item.category,
                        ...item.colors,
                    ].filter(Boolean).join(' ').toLowerCase();
                    return searchable.includes(q);
                }).slice(0, 20);
            },
        }),
        {
            name: 'catalog-storage',
            version: 1,
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({
                items: state.items.filter((i) => i.source === 'community'),
            }),
            merge: (persisted: any, current: CatalogState) => ({
                ...current,
                items: [
                    ...SEEDED_CATALOG,
                    ...(persisted?.items || []),
                ],
            }),
        },
    ),
);
