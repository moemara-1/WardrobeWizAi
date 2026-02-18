import { Radius, Typography } from '@/constants/Colors';
import { useThemeColors } from '@/contexts/ThemeContext';
import { useClosetStore } from '@/stores/closetStore';
import { ClosetItem } from '@/types';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router, type Href } from 'expo-router';
import { ArrowLeft, Search, X } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
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

export default function SearchToAddScreen() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const [query, setQuery] = useState('');

  const items = useClosetStore((s) => s.items);

  const filteredItems = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter((i) =>
      i.name.toLowerCase().includes(q) ||
      i.brand?.toLowerCase().includes(q) ||
      i.category.toLowerCase().includes(q) ||
      i.garment_type?.toLowerCase().includes(q) ||
      i.tags.some(t => t.toLowerCase().includes(q)) ||
      i.colors.some(c => c.toLowerCase().includes(q))
    );
  }, [items, query]);

  const handleItemPress = (item: ClosetItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: '/item/[id]', params: { id: item.id } } as Href);
  };

  const renderItem = ({ item }: { item: ClosetItem }) => (
    <Pressable style={styles.gridItem} onPress={() => handleItemPress(item)}>
      <Image
        source={{ uri: item.clean_image_url || item.image_url }}
        style={styles.gridImage}
        contentFit="cover"
      />
      <View style={styles.gridOverlay}>
        <Text style={styles.gridItemName} numberOfLines={1}>{item.name}</Text>
        {item.brand ? <Text style={styles.gridItemBrand} numberOfLines={1}>{item.brand}</Text> : null}
      </View>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable
          style={styles.backBtn}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}
        >
          <ArrowLeft size={20} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Search Closet</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.searchBar}>
        <Search size={18} color={Colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search your closet..."
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

      {filteredItems.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>
            {query.trim() ? 'No items found' : 'Your closet is empty'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {query.trim()
              ? `No items match "${query}"`
              : 'Add items to your closet first'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
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
    gridContent: { paddingBottom: 40 },
    gridRow: { gap: GRID_GAP },
    gridItem: { width: ITEM_SIZE, height: ITEM_SIZE, backgroundColor: '#FFFFFF', marginBottom: GRID_GAP, position: 'relative' },
    gridImage: { width: '100%', height: '100%' },
    gridOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 6, paddingVertical: 4, backgroundColor: 'rgba(0,0,0,0.55)' },
    gridItemName: { fontFamily: Typography.bodyFamilyMedium, fontSize: 11, color: '#FFFFFF' },
    gridItemBrand: { fontFamily: Typography.bodyFamily, fontSize: 9, color: 'rgba(255,255,255,0.7)', textTransform: 'capitalize' },
    emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 8 },
    emptyTitle: { fontFamily: Typography.bodyFamilyBold, fontSize: 18, color: C.textPrimary },
    emptySubtitle: { fontFamily: Typography.bodyFamily, fontSize: 14, color: C.textSecondary, textAlign: 'center' },
  });
}
