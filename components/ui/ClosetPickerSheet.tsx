import { Radius, Typography } from '@/constants/Colors';
import { useThemeColors } from '@/contexts/ThemeContext';
import { useClosetStore } from '@/stores/closetStore';
import { ClosetItem, ClothingCategory } from '@/types';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { Check, Search, X } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const NUM_COLUMNS = 3;
const GRID_GAP = 6;

const CATEGORY_FILTERS: { key: ClothingCategory | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'top', label: 'Tops' },
  { key: 'bottom', label: 'Bottoms' },
  { key: 'shoe', label: 'Shoes' },
  { key: 'outerwear', label: 'Outerwear' },
  { key: 'accessory', label: 'Accessories' },
  { key: 'bag', label: 'Bags' },
  { key: 'hat', label: 'Hats' },
  { key: 'jewelry', label: 'Jewelry' },
];

const ACCESSORY_CATEGORIES: ClothingCategory[] = ['accessory', 'bag', 'hat', 'jewelry'];

const ACCESSORY_FILTERS: { key: ClothingCategory | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'accessory', label: 'Accessories' },
  { key: 'bag', label: 'Bags' },
  { key: 'hat', label: 'Hats' },
  { key: 'jewelry', label: 'Jewelry' },
];

interface ClosetPickerSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (items: ClosetItem[]) => void;
  filterCategory?: ClothingCategory;
  excludeIds?: string[];
  multiSelect?: boolean;
  title?: string;
}

export function ClosetPickerSheet({
  visible,
  onClose,
  onSelect,
  filterCategory,
  excludeIds = [],
  multiSelect = false,
  title = 'Add from Closet',
}: ClosetPickerSheetProps) {
  const Colors = useThemeColors();
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const ITEM_SIZE = (SCREEN_WIDTH - 32 - GRID_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;

  const styles = useMemo(() => createStyles(Colors, ITEM_SIZE, insets.bottom), [Colors, ITEM_SIZE, insets.bottom]);

  const items = useClosetStore((s) => s.items);
  const [search, setSearch] = useState('');
  const [activeCat, setActiveCat] = useState<ClothingCategory | 'all'>(filterCategory || 'all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Determine if we're in accessories-only mode
  const accessoriesOnly = filterCategory === 'accessory';
  const visibleFilters = accessoriesOnly ? ACCESSORY_FILTERS : CATEGORY_FILTERS;

  const filtered = useMemo(() => {
    let result = items.filter((i) => !excludeIds.includes(i.id));
    // In accessories-only mode, always limit to accessory categories
    if (accessoriesOnly) {
      result = result.filter((i) => ACCESSORY_CATEGORIES.includes(i.category));
      if (activeCat !== 'all') result = result.filter((i) => i.category === activeCat);
    } else {
      if (activeCat !== 'all') result = result.filter((i) => i.category === activeCat);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.brand?.toLowerCase().includes(q) ||
          i.category.toLowerCase().includes(q),
      );
    }
    return result;
  }, [items, activeCat, search, excludeIds]);

  const toggleItem = (item: ClosetItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (multiSelect) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(item.id)) next.delete(item.id);
        else next.add(item.id);
        return next;
      });
    } else {
      onSelect([item]);
      handleClose();
    }
  };

  const handleDone = () => {
    const selected = items.filter((i) => selectedIds.has(i.id));
    onSelect(selected);
    handleClose();
  };

  const handleClose = () => {
    setSearch('');
    setSelectedIds(new Set());
    setActiveCat(filterCategory || 'all');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={handleClose} style={styles.closeBtn}>
            <X size={20} color={Colors.textPrimary} />
          </Pressable>
          <Text style={styles.title}>{title}</Text>
          {multiSelect ? (
            <Pressable
              onPress={handleDone}
              style={[styles.doneBtn, selectedIds.size === 0 && styles.doneBtnDisabled]}
              disabled={selectedIds.size === 0}
            >
              <Text style={[styles.doneText, selectedIds.size === 0 && styles.doneTextDisabled]}>
                Add ({selectedIds.size})
              </Text>
            </Pressable>
          ) : (
            <View style={{ width: 64 }} />
          )}
        </View>

        {/* Search */}
        <View style={styles.searchBar}>
          <Search size={16} color={Colors.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search your closet..."
            placeholderTextColor={Colors.textTertiary}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* Category pills */}
        <View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pillRow}
          >
            {visibleFilters.map((cat) => (
              <Pressable
                key={cat.key}
                style={[styles.pill, activeCat === cat.key && styles.pillActive]}
                onPress={() => { Haptics.selectionAsync(); setActiveCat(cat.key); }}
              >
                <Text style={[styles.pillText, activeCat === cat.key && styles.pillTextActive]}>
                  {cat.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Grid */}
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No items found</Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(i) => i.id}
            numColumns={NUM_COLUMNS}
            contentContainerStyle={styles.grid}
            columnWrapperStyle={styles.gridRow}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const isSelected = selectedIds.has(item.id);
              return (
                <Pressable style={styles.gridItem} onPress={() => toggleItem(item)}>
                  <Image
                    source={{ uri: item.clean_image_url || item.image_url }}
                    style={styles.gridImage}
                    contentFit="contain"
                  />
                  <Text style={styles.gridName} numberOfLines={1}>{item.name}</Text>
                  {multiSelect && isSelected && (
                    <View style={styles.checkBadge}>
                      <Check size={14} color={Colors.background} />
                    </View>
                  )}
                </Pressable>
              );
            }}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

function createStyles(C: any, ITEM_SIZE: number, bottomInset: number) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
    closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.cardSurfaceAlt, alignItems: 'center', justifyContent: 'center' },
    title: { fontFamily: Typography.bodyFamilyBold, fontSize: 16, color: C.textPrimary },
    doneBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: Radius.pill, backgroundColor: C.accentGreen },
    doneBtnDisabled: { backgroundColor: C.cardSurfaceAlt },
    doneText: { fontFamily: Typography.bodyFamilyBold, fontSize: 13, color: C.background },
    doneTextDisabled: { color: C.textTertiary },
    searchBar: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: C.cardSurfaceAlt, borderRadius: Radius.input, gap: 8, borderWidth: 1, borderColor: C.border },
    searchInput: { flex: 1, fontFamily: Typography.bodyFamily, fontSize: 14, color: C.textPrimary, padding: 0 },
    pillRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 6, paddingBottom: 12 },
    pill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.pill, backgroundColor: C.cardSurfaceAlt, borderWidth: 1, borderColor: C.border, height: 34, justifyContent: 'center' },
    pillActive: { backgroundColor: C.textPrimary, borderColor: C.textPrimary },
    pillText: { fontFamily: Typography.bodyFamilyMedium, fontSize: 12, color: C.textSecondary },
    pillTextActive: { color: C.background },
    grid: { paddingHorizontal: 16, paddingBottom: bottomInset + 20 },
    gridRow: { gap: GRID_GAP },
    gridItem: { width: ITEM_SIZE, marginBottom: GRID_GAP, alignItems: 'center', position: 'relative' },
    gridImage: { width: ITEM_SIZE, height: ITEM_SIZE, borderRadius: Radius.md, backgroundColor: '#FFFFFF' },
    gridName: { fontFamily: Typography.bodyFamily, fontSize: 11, color: C.textSecondary, marginTop: 2, textAlign: 'center' },
    checkBadge: { position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: 12, backgroundColor: C.accentGreen, alignItems: 'center', justifyContent: 'center' },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    emptyText: { fontFamily: Typography.bodyFamily, fontSize: 15, color: C.textTertiary },
  });
}
