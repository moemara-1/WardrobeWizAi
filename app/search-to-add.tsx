import { Radius, Typography } from '@/constants/Colors';
import { useThemeColors } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { generateId, useClosetStore } from '@/stores/closetStore';
import { ClosetItem, ClothingCategory } from '@/types';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ArrowLeft, Check, Search, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const NUM_COLUMNS = 3;
const GRID_GAP = 2;
const ITEM_SIZE = (SCREEN_WIDTH - GRID_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;
const DEBOUNCE_MS = 400;

interface SharedItem {
  id: string;
  name: string;
  category: ClothingCategory;
  brand: string | null;
  colors: string[];
  image_url: string | null;
  clean_image_url: string | null;
  garment_type: string | null;
  layer_type: string | null;
  tags: string[];
  estimated_value: number | null;
  model_name: string | null;
  subcategory: string | null;
}

const SHARED_ITEM_COLUMNS = 'id, name, category, brand, colors, image_url, clean_image_url, garment_type, layer_type, tags, estimated_value, model_name, subcategory';

export default function SearchToAddScreen() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SharedItem[]>([]);
  const [searchResults, setSearchResults] = useState<SharedItem[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const myItems = useClosetStore((s) => s.items);
  const addItem = useClosetStore((s) => s.addItem);
  const myItemIds = useMemo(() => new Set(myItems.map((i) => i.id)), [myItems]);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from('items')
          .select(SHARED_ITEM_COLUMNS)
          .not('clean_image_url', 'is', null)
          .order('created_at', { ascending: false })
          .limit(60);

        if (!error && data) {
          setSuggestions(
            (data as SharedItem[]).filter((item) => !myItemIds.has(item.id)),
          );
        }
      } catch (e) {
        if (__DEV__) console.warn('Failed to load suggestions:', e);
      } finally {
        setLoadingSuggestions(false);
      }
    })();
  }, [myItemIds]);

  const searchSupabase = useCallback(async (q: string) => {
    if (!q.trim()) {
      setSearchResults([]);
      setLoadingSearch(false);
      return;
    }

    setLoadingSearch(true);
    try {
      const searchTerm = `%${q.trim().toLowerCase()}%`;
      const { data, error } = await supabase
        .from('items')
        .select(SHARED_ITEM_COLUMNS)
        .or(`name.ilike.${searchTerm},brand.ilike.${searchTerm},category.ilike.${searchTerm},garment_type.ilike.${searchTerm}`)
        .limit(60);

      if (error) {
        if (__DEV__) console.warn('Search failed:', error);
        setSearchResults([]);
      } else {
        setSearchResults(
          ((data || []) as SharedItem[]).filter((item) => !myItemIds.has(item.id)),
        );
      }
    } catch (e) {
      if (__DEV__) console.warn('Search error:', e);
      setSearchResults([]);
    } finally {
      setLoadingSearch(false);
    }
  }, [myItemIds]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setSearchResults([]);
      setLoadingSearch(false);
      return;
    }
    setLoadingSearch(true);
    debounceRef.current = setTimeout(() => searchSupabase(query), DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, searchSupabase]);

  const handleAddItem = useCallback((shared: SharedItem) => {
    if (addedIds.has(shared.id)) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const newItem: ClosetItem = {
      id: generateId('item'),
      user_id: 'local',
      image_url: shared.image_url || '',
      clean_image_url: shared.clean_image_url || undefined,
      name: shared.name,
      category: shared.category,
      subcategory: shared.subcategory || undefined,
      brand: shared.brand || undefined,
      colors: shared.colors || [],
      garment_type: shared.garment_type || undefined,
      layer_type: (shared.layer_type as ClosetItem['layer_type']) || undefined,
      tags: shared.tags || [],
      estimated_value: shared.estimated_value || undefined,
      model_name: shared.model_name || undefined,
      detected_confidence: 1,
      wear_count: 0,
      favorite: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    addItem(newItem);
    setAddedIds((prev) => new Set(prev).add(shared.id));
  }, [addItem, addedIds]);

  const isSearching = query.trim().length > 0;
  const displayItems = isSearching ? searchResults : suggestions;
  const isLoading = isSearching ? loadingSearch : loadingSuggestions;

  const renderItem = ({ item }: { item: SharedItem }) => {
    const alreadyAdded = addedIds.has(item.id);

    return (
      <Pressable
        style={styles.gridItem}
        onPress={() => handleAddItem(item)}
        disabled={alreadyAdded}
      >
        <Image
          source={{ uri: item.clean_image_url || item.image_url || undefined }}
          style={styles.gridImage}
          contentFit="cover"
        />
        {alreadyAdded && (
          <View style={styles.addedOverlay}>
            <Check size={24} color="#FFF" strokeWidth={3} />
          </View>
        )}
        <View style={styles.gridOverlay}>
          <Text style={styles.gridItemName} numberOfLines={1}>{item.name}</Text>
          {item.brand ? <Text style={styles.gridItemBrand} numberOfLines={1}>{item.brand}</Text> : null}
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable
          style={styles.backBtn}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}
        >
          <ArrowLeft size={20} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Search Items</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.searchBar}>
        <Search size={18} color={Colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, brand, or category..."
          placeholderTextColor={Colors.textTertiary}
          value={query}
          onChangeText={setQuery}
          autoFocus
          returnKeyType="search"
          autoCorrect={false}
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery('')} hitSlop={8}>
            <X size={16} color={Colors.textTertiary} />
          </Pressable>
        )}
      </View>

      {!isSearching && !loadingSuggestions && suggestions.length > 0 && (
        <Text style={styles.sectionLabel}>Suggested for you</Text>
      )}

      {isLoading ? (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={Colors.accentGreen} />
        </View>
      ) : displayItems.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>
            {isSearching ? 'No items found' : 'No suggestions yet'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {isSearching
              ? 'Try a different search term'
              : 'Items added by other users will appear here'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={displayItems}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          numColumns={NUM_COLUMNS}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.gridContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

function createStyles(C: ReturnType<typeof import('@/contexts/ThemeContext').useThemeColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.background },
    headerBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12 },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.cardSurfaceAlt, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { flex: 1, fontFamily: Typography.bodyFamilyBold, fontSize: 18, color: C.textPrimary, textAlign: 'center' },
    headerSpacer: { width: 40 },
    searchBar: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: C.cardSurface, borderRadius: Radius.input, gap: 10, marginBottom: 12, borderWidth: 1, borderColor: C.border },
    searchInput: { flex: 1, fontFamily: Typography.bodyFamily, fontSize: 15, color: C.textPrimary, padding: 0 },
    sectionLabel: { fontFamily: Typography.bodyFamilyBold, fontSize: 14, color: C.textSecondary, paddingHorizontal: 16, marginBottom: 10 },
    gridContent: { paddingBottom: 40 },
    gridRow: { gap: GRID_GAP },
    gridItem: { width: ITEM_SIZE, height: ITEM_SIZE, backgroundColor: '#FFFFFF', marginBottom: GRID_GAP, position: 'relative' },
    gridImage: { width: '100%', height: '100%' },
    addedOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(50, 213, 131, 0.5)', alignItems: 'center', justifyContent: 'center', zIndex: 2 },
    gridOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 6, paddingVertical: 4, backgroundColor: 'rgba(0,0,0,0.55)' },
    gridItemName: { fontFamily: Typography.bodyFamilyMedium, fontSize: 11, color: '#FFFFFF' },
    gridItemBrand: { fontFamily: Typography.bodyFamily, fontSize: 9, color: 'rgba(255,255,255,0.7)', textTransform: 'capitalize' },
    emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 8 },
    emptyTitle: { fontFamily: Typography.bodyFamilyBold, fontSize: 18, color: C.textPrimary },
    emptySubtitle: { fontFamily: Typography.bodyFamily, fontSize: 14, color: C.textSecondary, textAlign: 'center' },
  });
}
