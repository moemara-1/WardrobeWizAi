import { AddToClosetSheet } from '@/components/ui/AddToClosetSheet';
import { Colors, Radius, Typography } from '@/constants/Colors';
import { useClosetStore } from '@/stores/closetStore';
import { ClothingCategory, ClosetItem } from '@/types';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { ChevronDown, Pencil, Plus, Sparkles, Trash2, X } from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
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

type ClosetTab = 'pieces' | 'fits' | 'collections';

type FilterKey = 'category' | 'garment_type' | 'color' | 'brand';
const FILTER_DEFS: { key: FilterKey; label: string }[] = [
  { key: 'category', label: 'Category' },
  { key: 'garment_type', label: 'Type' },
  { key: 'color', label: 'Color' },
  { key: 'brand', label: 'Brand' },
];

export default function ClosetScreen() {
  const [activeTab, setActiveTab] = useState<ClosetTab>('pieces');
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [editingItem, setEditingItem] = useState<ClosetItem | null>(null);

  const [activeFilterKey, setActiveFilterKey] = useState<FilterKey | null>(null);
  const [selectedFilters, setSelectedFilters] = useState<Record<FilterKey, string | null>>({
    category: null,
    garment_type: null,
    color: null,
    brand: null,
  });

  const items = useClosetStore((s) => s.items);
  const outfits = useClosetStore((s) => s.outfits);
  const updateItem = useClosetStore((s) => s.updateItem);
  const deleteItem = useClosetStore((s) => s.deleteItem);

  // Extract unique values for each filter from items
  const filterOptions = useMemo(() => {
    const sets: Record<FilterKey, Set<string>> = {
      category: new Set(), garment_type: new Set(), color: new Set(), brand: new Set(),
    };
    for (const item of items) {
      if (item.category) sets.category.add(item.category);
      if (item.garment_type) sets.garment_type.add(item.garment_type);
      if (item.brand) sets.brand.add(item.brand);
      for (const c of item.colors) { if (c) sets.color.add(c); }
    }
    const opts: Record<FilterKey, string[]> = { category: [], garment_type: [], color: [], brand: [] };
    for (const key of Object.keys(sets) as FilterKey[]) {
      opts[key] = Array.from(sets[key]).sort();
    }
    return opts;
  }, [items]);

  const displayItems = useMemo(() => {
    let filtered = items;
    if (favoritesOnly) filtered = filtered.filter((i) => i.favorite);
    if (selectedFilters.category) filtered = filtered.filter((i) => i.category === selectedFilters.category);
    if (selectedFilters.garment_type) filtered = filtered.filter((i) => i.garment_type === selectedFilters.garment_type);
    if (selectedFilters.color) filtered = filtered.filter((i) => i.colors.includes(selectedFilters.color!));
    if (selectedFilters.brand) filtered = filtered.filter((i) => i.brand === selectedFilters.brand);
    return filtered;
  }, [items, favoritesOnly, selectedFilters]);

  const hasActiveFilters = Object.values(selectedFilters).some(Boolean) || favoritesOnly;

  const clearAllFilters = () => {
    setSelectedFilters({ category: null, garment_type: null, color: null, brand: null });
    setFavoritesOnly(false);
  };

  const pickFromCamera = useCallback(async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      router.push({ pathname: '/analyze', params: { imageUri: result.assets[0].uri } } as never);
    }
  }, []);

  const pickFromLibrary = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      router.push({ pathname: '/analyze', params: { imageUri: result.assets[0].uri } } as never);
    }
  }, []);

  const handleAddSheetAction = (action: string) => {
    setShowAddSheet(false);
    if (action === 'search') router.push('/search-to-add' as never);
    else if (action === 'import') router.push('/import-fit-pic' as never);
    else if (action === 'camera') pickFromCamera();
    else if (action === 'library') pickFromLibrary();
  };

  const handleDeleteItem = (item: ClosetItem) => {
    Alert.alert('Delete Item', `Remove "${item.name}" from your closet?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: () => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); deleteItem(item.id); },
      },
    ]);
  };

  const handleToggleFilter = (key: FilterKey) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveFilterKey((prev) => (prev === key ? null : key));
  };

  const handleSelectFilterValue = (key: FilterKey, value: string) => {
    Haptics.selectionAsync();
    setSelectedFilters((prev) => ({ ...prev, [key]: prev[key] === value ? null : value }));
    setActiveFilterKey(null);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topTabs}>
        {(['pieces', 'fits', 'collections'] as ClosetTab[]).map((tab) => (
          <Pressable key={tab} style={styles.topTab}
            onPress={() => { Haptics.selectionAsync(); setActiveTab(tab); }}>
            <Text style={[styles.topTabText, activeTab === tab && styles.topTabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
            {activeTab === tab && <View style={styles.topTabIndicator} />}
          </Pressable>
        ))}
      </View>

      {activeTab === 'pieces' && (
        <>
          <View style={styles.filterWrapper}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              <Pressable
                style={[styles.filterPill, favoritesOnly && styles.filterPillActive]}
                onPress={() => { Haptics.selectionAsync(); setFavoritesOnly(!favoritesOnly); }}
              >
                <Text style={[styles.filterPillText, favoritesOnly && styles.filterPillTextActive]}>
                  ♥ Favorites
                </Text>
              </Pressable>

              {FILTER_DEFS.map((f) => {
                const isActive = selectedFilters[f.key] !== null;
                const isOpen = activeFilterKey === f.key;
                return (
                  <Pressable key={f.key}
                    style={[styles.filterPill, isActive && styles.filterPillActive, isOpen && styles.filterPillOpen]}
                    onPress={() => handleToggleFilter(f.key)}
                  >
                    <Text style={[styles.filterPillText, isActive && styles.filterPillTextActive]}>
                      {isActive ? selectedFilters[f.key] : f.label}
                    </Text>
                    <ChevronDown size={12} color={isActive ? Colors.background : Colors.textSecondary} />
                  </Pressable>
                );
              })}

              {hasActiveFilters && (
                <Pressable style={styles.clearBtn} onPress={() => { Haptics.selectionAsync(); clearAllFilters(); }}>
                  <X size={14} color={Colors.textSecondary} />
                </Pressable>
              )}
            </ScrollView>
          </View>

          {activeFilterKey && (
            <View style={styles.dropdownPanel}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dropdownRow}>
                {filterOptions[activeFilterKey].length === 0 ? (
                  <Text style={styles.dropdownEmpty}>No options yet</Text>
                ) : (
                  filterOptions[activeFilterKey].map((val) => {
                    const isSelected = selectedFilters[activeFilterKey] === val;
                    return (
                      <Pressable key={val}
                        style={[styles.dropdownChip, isSelected && styles.dropdownChipActive]}
                        onPress={() => handleSelectFilterValue(activeFilterKey, val)}
                      >
                        <Text style={[styles.dropdownChipText, isSelected && styles.dropdownChipTextActive]}>
                          {val}
                        </Text>
                      </Pressable>
                    );
                  })
                )}
              </ScrollView>
            </View>
          )}

          {displayItems.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>{hasActiveFilters ? 'No matches' : 'No pieces yet'}</Text>
              <Text style={styles.emptySubtitle}>
                {hasActiveFilters ? 'Try changing your filters' : 'Take a photo or pick from your library to add your first piece'}
              </Text>
              {hasActiveFilters ? (
                <Pressable style={styles.emptyBtn} onPress={clearAllFilters}>
                  <Text style={styles.emptyBtnText}>Clear Filters</Text>
                </Pressable>
              ) : (
                <Pressable style={styles.emptyBtn} onPress={() => setShowAddSheet(true)}>
                  <Plus size={18} color={Colors.background} />
                  <Text style={styles.emptyBtnText}>Add Piece</Text>
                </Pressable>
              )}
            </View>
          ) : (
            <FlatList
              data={displayItems}
              keyExtractor={(item) => item.id}
              numColumns={NUM_COLUMNS}
              renderItem={({ item }) => (
                <Pressable style={styles.gridItem}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(`/item/${item.id}` as never); }}
                  onLongPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); setEditingItem(item); }}
                >
                  <Image source={{ uri: item.clean_image_url || item.image_url }} style={styles.gridImage} resizeMode="contain" />
                </Pressable>
              )}
              contentContainerStyle={styles.gridContent}
              showsVerticalScrollIndicator={false}
              columnWrapperStyle={styles.gridRow}
            />
          )}
        </>
      )}

      {activeTab === 'fits' && (
        <View style={styles.fitsContainer}>
          {outfits.length === 0 ? (
            <View style={styles.emptyState}>
              <Sparkles size={32} color={Colors.textTertiary} strokeWidth={1.2} />
              <Text style={styles.emptyTitle}>No fits saved</Text>
              <Text style={styles.emptySubtitle}>Create and save outfits from the Stylist tab to see them here</Text>
            </View>
          ) : (
            <FlatList data={outfits} keyExtractor={(o) => o.id}
              renderItem={({ item: outfit }) => (
                <View style={styles.fitCard}>
                  <View style={styles.fitCardItems}>
                    {outfit.items.slice(0, 5).map((piece) => (
                      <View key={piece.id} style={styles.fitCardThumb}>
                        <Image source={{ uri: piece.clean_image_url || piece.image_url }} style={styles.fitCardImage} resizeMode="contain" />
                      </View>
                    ))}
                  </View>
                  <Text style={styles.fitCardTitle}>{outfit.name}</Text>
                  <Text style={styles.fitCardSubtitle}>{outfit.items.length} pieces · {outfit.occasion || 'casual'}</Text>
                </View>
              )}
              contentContainerStyle={styles.gridContent}
            />
          )}
        </View>
      )}

      {activeTab === 'collections' && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No collections yet</Text>
          <Text style={styles.emptySubtitle}>Organize your pieces and fits into collections</Text>
        </View>
      )}

      <Pressable style={styles.fab} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setShowAddSheet(true); }}>
        <Plus size={26} color={Colors.background} />
      </Pressable>

      <AddToClosetSheet visible={showAddSheet} onClose={() => setShowAddSheet(false)} onAction={handleAddSheetAction} />

      <EditItemModal
        item={editingItem}
        onClose={() => setEditingItem(null)}
        onSave={(id, updates) => { updateItem(id, updates); setEditingItem(null); }}
        onDelete={(item) => { setEditingItem(null); handleDeleteItem(item); }}
      />
    </SafeAreaView>
  );
}

function EditItemModal({ item, onClose, onSave, onDelete }: {
  item: ClosetItem | null;
  onClose: () => void;
  onSave: (id: string, updates: Partial<ClosetItem>) => void;
  onDelete: (item: ClosetItem) => void;
}) {
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState('');
  const [garmentType, setGarmentType] = useState('');

  React.useEffect(() => {
    if (item) {
      setName(item.name);
      setBrand(item.brand || '');
      setCategory(item.category || '');
      setGarmentType(item.garment_type || '');
    }
  }, [item]);

  if (!item) return null;

  return (
    <Modal visible={!!item} transparent animationType="slide">
      <View style={editStyles.overlay}>
        <Pressable style={editStyles.backdrop} onPress={onClose} />
        <View style={editStyles.sheet}>
          <View style={editStyles.handle} />
          <View style={editStyles.header}>
            <Text style={editStyles.headerTitle}>Edit Item</Text>
            <Pressable onPress={onClose}><X size={20} color={Colors.textSecondary} /></Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} style={editStyles.body}>
            <View style={editStyles.imagePreview}>
              <Image source={{ uri: item.clean_image_url || item.image_url }} style={editStyles.previewImage} resizeMode="contain" />
            </View>

            <Text style={editStyles.fieldLabel}>Name</Text>
            <TextInput style={editStyles.input} value={name} onChangeText={setName} placeholderTextColor={Colors.textTertiary} />

            <Text style={editStyles.fieldLabel}>Brand</Text>
            <TextInput style={editStyles.input} value={brand} onChangeText={setBrand} placeholder="Enter brand" placeholderTextColor={Colors.textTertiary} />

            <Text style={editStyles.fieldLabel}>Category</Text>
            <TextInput style={editStyles.input} value={category} onChangeText={setCategory} placeholder="e.g. top, bottom, shoe" placeholderTextColor={Colors.textTertiary} />

            <Text style={editStyles.fieldLabel}>Garment Type</Text>
            <TextInput style={editStyles.input} value={garmentType} onChangeText={setGarmentType} placeholder="e.g. t-shirt, jeans" placeholderTextColor={Colors.textTertiary} />

            <View style={editStyles.actions}>
              <Pressable style={editStyles.saveBtn} onPress={() => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                onSave(item.id, {
                  name, brand: brand || undefined,
                  category: (category as ClothingCategory) || item.category,
                  garment_type: garmentType || undefined,
                });
              }}>
                <Pencil size={16} color={Colors.background} />
                <Text style={editStyles.saveBtnText}>Save Changes</Text>
              </Pressable>
              <Pressable style={editStyles.deleteBtn} onPress={() => onDelete(item)}>
                <Trash2 size={16} color={Colors.accentCoral} />
                <Text style={editStyles.deleteBtnText}>Delete Item</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const editStyles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: { backgroundColor: Colors.cardSurface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%', paddingBottom: 40 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.textTertiary, alignSelf: 'center', marginTop: 10, marginBottom: 8 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerTitle: { fontFamily: Typography.bodyFamilyBold, fontSize: 17, color: Colors.textPrimary },
  body: { paddingHorizontal: 20, paddingTop: 16 },
  imagePreview: { width: 120, height: 120, backgroundColor: '#FFFFFF', borderRadius: Radius.lg, alignSelf: 'center', marginBottom: 20, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  previewImage: { width: '85%', height: '85%' },
  fieldLabel: { fontFamily: Typography.bodyFamilyMedium, fontSize: 13, color: Colors.textSecondary, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: Colors.cardSurfaceAlt, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 12, fontFamily: Typography.bodyFamily, fontSize: 15, color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.border },
  actions: { marginTop: 28, gap: 12, paddingBottom: 20 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.accentGreen, paddingVertical: 14, borderRadius: Radius.pill },
  saveBtnText: { fontFamily: Typography.bodyFamilyBold, fontSize: 15, color: Colors.background },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: Radius.pill, borderWidth: 1, borderColor: Colors.accentCoral, backgroundColor: 'rgba(232, 90, 79, 0.08)' },
  deleteBtnText: { fontFamily: Typography.bodyFamilyBold, fontSize: 15, color: Colors.accentCoral },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  topTabs: { flexDirection: 'row', paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  topTab: { flex: 1, alignItems: 'center', paddingVertical: 12, position: 'relative' },
  topTabText: { fontFamily: Typography.bodyFamilyMedium, fontSize: 15, color: Colors.textTertiary },
  topTabTextActive: { fontFamily: Typography.bodyFamilyBold, color: Colors.textPrimary },
  topTabIndicator: { position: 'absolute', bottom: 0, left: 16, right: 16, height: 2, backgroundColor: Colors.textPrimary, borderRadius: 1 },
  filterWrapper: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  filterRow: { paddingHorizontal: 16, paddingVertical: 10, gap: 8, alignItems: 'center' },
  filterPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.pill, backgroundColor: Colors.cardSurfaceAlt, borderWidth: 1, borderColor: Colors.border },
  filterPillActive: { backgroundColor: Colors.textPrimary, borderColor: Colors.textPrimary },
  filterPillOpen: { borderColor: Colors.accentBlue },
  filterPillText: { fontFamily: Typography.bodyFamilyMedium, fontSize: 13, color: Colors.textSecondary, textTransform: 'capitalize' },
  filterPillTextActive: { color: Colors.background },
  clearBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.cardSurfaceAlt, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  dropdownPanel: { backgroundColor: Colors.cardSurface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  dropdownRow: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  dropdownEmpty: { fontFamily: Typography.bodyFamily, fontSize: 13, color: Colors.textTertiary },
  dropdownChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.pill, backgroundColor: Colors.cardSurfaceAlt, borderWidth: 1, borderColor: Colors.border },
  dropdownChipActive: { backgroundColor: Colors.accentBlue, borderColor: Colors.accentBlue },
  dropdownChipText: { fontFamily: Typography.bodyFamilyMedium, fontSize: 13, color: Colors.textSecondary, textTransform: 'capitalize' },
  dropdownChipTextActive: { color: Colors.textPrimary },
  gridContent: { paddingBottom: 120 },
  gridRow: { gap: GRID_GAP },
  gridItem: { width: ITEM_SIZE, height: ITEM_SIZE, backgroundColor: '#FFFFFF', marginBottom: GRID_GAP },
  gridImage: { width: '100%', height: '100%' },
  fab: { position: 'absolute', bottom: 110, alignSelf: 'center', width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.accentGreen, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 12 },
  emptyTitle: { fontFamily: Typography.bodyFamilyBold, fontSize: 18, color: Colors.textPrimary },
  emptySubtitle: { fontFamily: Typography.bodyFamily, fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 12, borderRadius: Radius.pill, backgroundColor: Colors.accentGreen, marginTop: 8 },
  emptyBtnText: { fontFamily: Typography.bodyFamilyBold, fontSize: 14, color: Colors.background },
  fitsContainer: { flex: 1 },
  fitCard: { marginHorizontal: 16, marginBottom: 12, padding: 16, backgroundColor: '#FFFFFF', borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border },
  fitCardItems: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 },
  fitCardThumb: { width: 72, height: 72, backgroundColor: '#FFFFFF', borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  fitCardImage: { width: '90%', height: '90%' },
  fitCardTitle: { fontFamily: Typography.bodyFamilyBold, fontSize: 16, color: Colors.textPrimary },
  fitCardSubtitle: { fontFamily: Typography.bodyFamily, fontSize: 13, color: Colors.textSecondary, marginTop: 4, textTransform: 'capitalize' },
});
