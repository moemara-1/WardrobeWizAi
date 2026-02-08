import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Heart } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Colors, Radius, Spacing, Typography } from '@/constants/Colors';
import { CategoryPills } from '@/components/ui/CategoryPills';
import { ClosetItemCard } from '@/components/ui/ClosetItemCard';
import { useClosetStore, useFilteredItems } from '@/stores/closetStore';
import { ClosetItem, ClothingCategory } from '@/types';

const CATEGORIES = ['All', 'Tops', 'Bottoms', 'Footwear', 'Outer'];
const CATEGORY_MAP: Record<string, ClothingCategory | null> = {
  All: null,
  Tops: 'top',
  Bottoms: 'bottom',
  Footwear: 'shoe',
  Outer: 'outerwear',
};

const MOCK_ITEMS: ClosetItem[] = [
  {
    id: '1', user_id: 'demo',
    image_url: 'https://images.unsplash.com/photo-1544441893-675973e31985?w=400',
    name: '1996 Retro Nuptse', category: 'outerwear', brand: 'The North Face',
    colors: ['black', 'red'], detected_confidence: 0.95, tags: ['vintage', 'streetwear'],
    wear_count: 12, favorite: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  },
  {
    id: '2', user_id: 'demo',
    image_url: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400',
    name: 'Classic Blue Denim', category: 'bottom', brand: "Levi's",
    colors: ['blue'], detected_confidence: 0.92, tags: ['casual'],
    wear_count: 28, favorite: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  },
  {
    id: '3', user_id: 'demo',
    image_url: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400',
    name: 'AJ1 Retro High', category: 'shoe', brand: 'Nike',
    colors: ['red', 'black', 'white'], detected_confidence: 0.98, tags: ['sneakers'],
    wear_count: 8, favorite: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  },
  {
    id: '4', user_id: 'demo',
    image_url: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=400',
    name: 'Essential White Tee', category: 'top', colors: ['white'],
    detected_confidence: 0.88, tags: ['basic'], wear_count: 42, favorite: false,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  },
  {
    id: '5', user_id: 'demo',
    image_url: 'https://images.unsplash.com/photo-1622470953794-aa9c70b0fb9d?w=400',
    name: 'Oversized Hoodie', category: 'top', brand: 'Essentials',
    colors: ['black'], detected_confidence: 0.91, tags: ['streetwear'],
    wear_count: 15, favorite: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  },
  {
    id: '6', user_id: 'demo',
    image_url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400',
    name: 'Canvas Backpack', category: 'bag', brand: 'Herschel',
    colors: ['brown', 'tan'], detected_confidence: 0.87, tags: ['school'],
    wear_count: 50, favorite: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  },
];

export default function ClosetScreen() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [showFavorites, setShowFavorites] = useState(false);
  const { setItems, setCategoryFilter } = useClosetStore();
  const filteredItems = useFilteredItems();

  useEffect(() => {
    setItems(MOCK_ITEMS);
  }, []);

  const handleCategoryChange = useCallback((category: string) => {
    setActiveCategory(category);
    setCategoryFilter(CATEGORY_MAP[category] ?? null);
  }, [setCategoryFilter]);

  const displayItems = showFavorites
    ? filteredItems.filter((i) => i.favorite)
    : filteredItems;

  const leftColumn = displayItems.filter((_, i) => i % 2 === 0);
  const rightColumn = displayItems.filter((_, i) => i % 2 === 1);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={[1]}
        keyExtractor={() => 'closet'}
        renderItem={() => (
          <View style={styles.grid}>
            <View style={styles.column}>
              {leftColumn.map((item) => (
                <ClosetItemCard key={item.id} item={item} />
              ))}
            </View>
            <View style={styles.column}>
              {rightColumn.map((item) => (
                <ClosetItemCard key={item.id} item={item} />
              ))}
            </View>
          </View>
        )}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>My Closet</Text>
              <Pressable
                style={[styles.favToggle, showFavorites && styles.favToggleActive]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setShowFavorites((v) => !v);
                }}
              >
                <Heart
                  size={16}
                  color={showFavorites ? Colors.accentCoral : Colors.textSecondary}
                  fill={showFavorites ? Colors.accentCoral : 'none'}
                />
              </Pressable>
            </View>
            <CategoryPills
              categories={CATEGORIES}
              activeCategory={activeCategory}
              onSelect={handleCategoryChange}
            />
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No items found</Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingBottom: 100,
  },
  header: {
    gap: 12,
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  title: {
    fontFamily: Typography.serifFamilyBold,
    fontSize: 28,
    color: Colors.textPrimary,
  },
  favToggle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.cardSurfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  favToggleActive: {
    borderColor: Colors.accentCoral,
    backgroundColor: 'rgba(232, 90, 79, 0.12)',
  },
  grid: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
  },
  column: {
    flex: 1,
  },
  empty: {
    padding: 48,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: Typography.bodyFamily,
    fontSize: 15,
    color: Colors.textSecondary,
  },
});
