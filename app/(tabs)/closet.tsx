import { AddToClosetSheet } from '@/components/ui/AddToClosetSheet';
import { Radius, Typography } from '@/constants/Colors';
import { useThemeColors } from '@/contexts/ThemeContext';
import { classifyGarmentSlot, GarmentSlot } from '@/lib/backgroundRemoval';
import { generateId, useClosetStore } from '@/stores/closetStore';
import { ClosetItem, ClothingCategory, Collection, Outfit } from '@/types';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, type Href } from 'expo-router';
import { ChevronDown, Pencil, Play, Plus, Search, Sparkles, Trash2, X } from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import {
    Alert,
    Dimensions,
    FlatList,
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
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const fitModalStyles = useMemo(() => createFitModalStyles(Colors), [Colors]);
  const colStyles = useMemo(() => createColStyles(Colors), [Colors]);
  const [activeTab, setActiveTab] = useState<ClosetTab>('pieces');
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [editingItem, setEditingItem] = useState<ClosetItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [activeFilterKey, setActiveFilterKey] = useState<FilterKey | null>(null);
  const [selectedFilters, setSelectedFilters] = useState<Record<FilterKey, string | null>>({
    category: null,
    garment_type: null,
    color: null,
    brand: null,
  });
  const [selectedFit, setSelectedFit] = useState<Outfit | null>(null);
  const [showCreateCollection, setShowCreateCollection] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);

  const items = useClosetStore((s) => s.items);
  const outfits = useClosetStore((s) => s.outfits);
  const collections = useClosetStore((s) => s.collections);
  const updateItem = useClosetStore((s) => s.updateItem);
  const deleteItem = useClosetStore((s) => s.deleteItem);
  const deleteOutfit = useClosetStore((s) => s.deleteOutfit);
  const setCanvasOutfit = useClosetStore((s) => s.setCanvasOutfit);
  const addCollection = useClosetStore((s) => s.addCollection);
  const updateCollection = useClosetStore((s) => s.updateCollection);
  const deleteCollection = useClosetStore((s) => s.deleteCollection);

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
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((i) =>
        i.name.toLowerCase().includes(q) ||
        i.brand?.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q) ||
        i.garment_type?.toLowerCase().includes(q) ||
        i.tags.some(t => t.toLowerCase().includes(q)) ||
        i.colors.some(c => c.toLowerCase().includes(q))
      );
    }
    if (favoritesOnly) filtered = filtered.filter((i) => i.favorite);
    if (selectedFilters.category) filtered = filtered.filter((i) => i.category === selectedFilters.category);
    if (selectedFilters.garment_type) filtered = filtered.filter((i) => i.garment_type === selectedFilters.garment_type);
    if (selectedFilters.color) filtered = filtered.filter((i) => i.colors.includes(selectedFilters.color!));
    if (selectedFilters.brand) filtered = filtered.filter((i) => i.brand === selectedFilters.brand);
    return filtered;
  }, [items, searchQuery, favoritesOnly, selectedFilters]);

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
      router.push({ pathname: '/analyze', params: { imageUri: result.assets[0].uri } } as Href);
    }
  }, []);

  const pickFromLibrary = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      router.push({ pathname: '/analyze', params: { imageUri: result.assets[0].uri } } as Href);
    }
  }, []);

  const handleAddSheetAction = (action: string) => {
    setShowAddSheet(false);
    if (action === 'search') router.push('/search-to-add' as Href);
    else if (action === 'import') router.push('/import-fit-pic' as Href);
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
    setActiveFilterKey(activeFilterKey === key ? null : key);
  };

  const handleSelectFilterValue = (key: FilterKey, value: string) => {
    Haptics.selectionAsync();
    setSelectedFilters((prev) => ({ ...prev, [key]: prev[key] === value ? null : value }));
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
          <View style={styles.searchBar}>
            <Search size={16} color={Colors.textTertiary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search items..."
              placeholderTextColor={Colors.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                <X size={14} color={Colors.textTertiary} />
              </Pressable>
            )}
          </View>
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
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(`/item/${item.id}` as Href); }}
                  onLongPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); setEditingItem(item); }}
                >
                  <Image source={{ uri: item.clean_image_url || item.image_url }} style={styles.gridImage} contentFit="contain" />
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
              numColumns={3}
              columnWrapperStyle={{ gap: 6 }}
              contentContainerStyle={{ padding: 10, paddingBottom: 120 }}
              renderItem={({ item: outfit }) => {
                const resolvedItems = outfit.item_ids
                  .map((oid) => items.find((i) => i.id === oid))
                  .filter(Boolean) as ClosetItem[];
                const slotOrder: GarmentSlot[] = ['headwear', 'top', 'bottom', 'footwear'];
                const bySlot = slotOrder
                  .map(slot => resolvedItems.find(ri => classifyGarmentSlot(ri.category, ri.garment_type || undefined) === slot))
                  .filter(Boolean) as ClosetItem[];
                const displayPieces = bySlot.length > 0 ? bySlot : resolvedItems;

                return (
                  <Pressable
                    style={styles.fitPreviewCard}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedFit(outfit);
                    }}
                  >
                    <View style={styles.fitStackPreview}>
                      {outfit.collage_url ? (
                        <Image source={{ uri: outfit.collage_url }} style={styles.fitCollageImage} contentFit="cover" />
                      ) : (
                        <View style={styles.fitMannequinStack}>
                          {displayPieces.slice(0, 4).map((piece, idx) => (
                            <View key={piece.id} style={[styles.fitMannequinSlot, idx > 0 && { marginTop: -18 }]}>
                              <Image source={{ uri: piece.clean_image_url || piece.image_url }} style={styles.fitMannequinImage} contentFit="contain" />
                            </View>
                          ))}
                          {displayPieces.length === 0 && (
                            <View style={styles.fitEmptySlot}>
                              <Sparkles size={18} color={Colors.textTertiary} />
                            </View>
                          )}
                        </View>
                      )}
                    </View>
                    <Text style={styles.fitPreviewTitle} numberOfLines={1}>{outfit.name}</Text>
                    <Text style={styles.fitPreviewSub}>{resolvedItems.length} pieces</Text>
                  </Pressable>
                );
              }}
            />
          )}

          {/* Fit Detail Modal */}
          {selectedFit && (
            <Modal visible={!!selectedFit} transparent animationType="slide">
              <View style={fitModalStyles.overlay}>
                <Pressable style={fitModalStyles.backdrop} onPress={() => setSelectedFit(null)} />
                <View style={fitModalStyles.sheet}>
                  <View style={fitModalStyles.handle} />
                  <View style={fitModalStyles.header}>
                    <View>
                      <Text style={fitModalStyles.title}>{selectedFit.name}</Text>
                      <Text style={fitModalStyles.subtitle}>
                        {selectedFit.item_ids.length} pieces · {selectedFit.occasion || 'casual'}
                      </Text>
                    </View>
                    <Pressable onPress={() => setSelectedFit(null)}>
                      <X size={20} color={Colors.textSecondary} />
                    </Pressable>
                  </View>

                  <View style={fitModalStyles.canvasPreview}>
                    {(() => {
                      const resolvedItems = selectedFit.item_ids
                        .map((oid) => items.find((i) => i.id === oid))
                        .filter(Boolean) as ClosetItem[];

                      if (selectedFit.collage_url) {
                        return (
                          <Image source={{ uri: selectedFit.collage_url }} style={fitModalStyles.collageImage} contentFit="cover" />
                        );
                      }

                      const slotOrder: GarmentSlot[] = ['headwear', 'top', 'bottom', 'footwear'];
                      const bySlot = slotOrder
                        .map(slot => resolvedItems.find(ri => classifyGarmentSlot(ri.category, ri.garment_type || undefined) === slot))
                        .filter(Boolean) as ClosetItem[];
                      const displayPieces = bySlot.length > 0 ? bySlot : resolvedItems;
                      return (
                        <View style={fitModalStyles.mannequinStack}>
                          {displayPieces.map((piece, idx) => (
                            <View key={piece.id} style={[fitModalStyles.mannequinSlot, idx > 0 && { marginTop: -24 }]}>
                              <Image source={{ uri: piece.clean_image_url || piece.image_url }} style={fitModalStyles.mannequinImage} contentFit="contain" />
                              <Text style={fitModalStyles.slotLabel}>{piece.name}</Text>
                            </View>
                          ))}
                        </View>
                      );
                    })()}
                  </View>

                  <View style={fitModalStyles.actions}>
                    <Pressable style={fitModalStyles.loadBtn} onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      setCanvasOutfit(selectedFit);
                      setSelectedFit(null);
                      router.push('/(tabs)/stylist' as Href);
                    }}>
                      <Play size={16} color={Colors.background} />
                      <Text style={fitModalStyles.loadBtnText}>Load to Canvas</Text>
                    </Pressable>
                    <Pressable style={fitModalStyles.deleteBtn} onPress={() => {
                      Alert.alert('Delete Fit', `Remove "${selectedFit.name}"?`, [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Delete', style: 'destructive', onPress: () => {
                          deleteOutfit(selectedFit.id);
                          setSelectedFit(null);
                        }},
                      ]);
                    }}>
                      <Trash2 size={16} color={Colors.accentCoral} />
                      <Text style={fitModalStyles.deleteBtnText}>Delete</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            </Modal>
          )}
        </View>
      )}

      {activeTab === 'collections' && (
        <View style={{ flex: 1 }}>
          {collections.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No collections yet</Text>
              <Text style={styles.emptySubtitle}>Organize your pieces and fits into collections</Text>
              <Pressable style={styles.emptyBtn} onPress={() => setShowCreateCollection(true)}>
                <Plus size={18} color={Colors.background} />
                <Text style={styles.emptyBtnText}>Create Collection</Text>
              </Pressable>
            </View>
          ) : (
            <FlatList
              data={collections}
              keyExtractor={(c) => c.id}
              numColumns={2}
              columnWrapperStyle={{ gap: 12 }}
              contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
              renderItem={({ item: collection }) => {
                const coverItem = collection.item_ids.length > 0
                  ? items.find((i) => i.id === collection.item_ids[0])
                  : null;
                const coverUri = collection.cover_image_url || coverItem?.clean_image_url || coverItem?.image_url;
                return (
                  <Pressable
                    style={colStyles.card}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedCollection(collection); }}
                    onLongPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); setEditingCollection(collection); }}
                  >
                    <View style={colStyles.coverFrame}>
                      {coverUri ? (
                        <Image source={{ uri: coverUri }} style={colStyles.coverImage} contentFit="cover" />
                      ) : (
                        <View style={colStyles.coverPlaceholder}>
                          <Plus size={24} color={Colors.textTertiary} />
                        </View>
                      )}
                    </View>
                    <Text style={colStyles.name} numberOfLines={1}>{collection.name}</Text>
                    <Text style={colStyles.count}>{collection.item_ids.length} pieces</Text>
                  </Pressable>
                );
              }}
              ListHeaderComponent={
                <Pressable style={colStyles.createBtn} onPress={() => setShowCreateCollection(true)}>
                  <Plus size={16} color={Colors.accentGreen} />
                  <Text style={colStyles.createBtnText}>New Collection</Text>
                </Pressable>
              }
            />
          )}

          <CreateCollectionModal
            visible={showCreateCollection}
            onClose={() => setShowCreateCollection(false)}
            items={items}
            onSave={(name, description, itemIds) => {
              addCollection({
                id: generateId('col'),
                user_id: 'demo',
                name,
                description: description || undefined,
                item_ids: itemIds,
                outfit_ids: [],
                created_at: new Date().toISOString(),
              });
              setShowCreateCollection(false);
            }}
          />

          {selectedCollection && (
            <Modal visible={!!selectedCollection} transparent animationType="slide">
              <View style={colStyles.modalOverlay}>
                <Pressable style={colStyles.modalBackdrop} onPress={() => setSelectedCollection(null)} />
                <View style={colStyles.modalSheet}>
                  <View style={colStyles.modalHandle} />
                  <View style={colStyles.modalHeader}>
                    <View>
                      <Text style={colStyles.modalTitle}>{selectedCollection.name}</Text>
                      {selectedCollection.description && (
                        <Text style={colStyles.modalDesc}>{selectedCollection.description}</Text>
                      )}
                    </View>
                    <Pressable onPress={() => setSelectedCollection(null)}>
                      <X size={20} color={Colors.textSecondary} />
                    </Pressable>
                  </View>
                  <FlatList
                    data={selectedCollection.item_ids.map((id) => items.find((i) => i.id === id)).filter(Boolean) as ClosetItem[]}
                    keyExtractor={(i) => i.id}
                    numColumns={3}
                    columnWrapperStyle={{ gap: GRID_GAP }}
                    contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
                    renderItem={({ item }) => (
                      <Pressable style={styles.gridItem}
                        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(`/item/${item.id}` as Href); }}>
                        <Image source={{ uri: item.clean_image_url || item.image_url }} style={styles.gridImage} contentFit="contain" />
                      </Pressable>
                    )}
                    ListEmptyComponent={
                      <View style={styles.emptyState}>
                        <Text style={styles.emptySubtitle}>No items in this collection</Text>
                      </View>
                    }
                  />
                </View>
              </View>
            </Modal>
          )}

          {editingCollection && (
            <Modal visible={!!editingCollection} transparent animationType="fade">
              <View style={colStyles.modalOverlay}>
                <Pressable style={colStyles.modalBackdrop} onPress={() => setEditingCollection(null)} />
                <View style={colStyles.editSheet}>
                  <Pressable style={colStyles.editAction} onPress={() => {
                    setEditingCollection(null);
                    setShowCreateCollection(true);
                  }}>
                    <Pencil size={16} color={Colors.textPrimary} />
                    <Text style={colStyles.editActionText}>Edit Collection</Text>
                  </Pressable>
                  <Pressable style={colStyles.editAction} onPress={() => {
                    Alert.alert('Delete Collection', `Remove "${editingCollection.name}"?`, [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Delete', style: 'destructive', onPress: () => {
                        deleteCollection(editingCollection.id);
                        setEditingCollection(null);
                      }},
                    ]);
                  }}>
                    <Trash2 size={16} color={Colors.accentCoral} />
                    <Text style={[colStyles.editActionText, { color: Colors.accentCoral }]}>Delete Collection</Text>
                  </Pressable>
                  <Pressable style={colStyles.editCancel} onPress={() => setEditingCollection(null)}>
                    <Text style={colStyles.editCancelText}>Cancel</Text>
                  </Pressable>
                </View>
              </View>
            </Modal>
          )}
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

function CreateCollectionModal({ visible, onClose, items, onSave }: {
  visible: boolean;
  onClose: () => void;
  items: ClosetItem[];
  onSave: (name: string, description: string, itemIds: string[]) => void;
}) {
  const Colors = useThemeColors();
  const colStyles = useMemo(() => createColStyles(Colors), [Colors]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  React.useEffect(() => {
    if (visible) { setName(''); setDescription(''); setSelectedIds([]); }
  }, [visible]);

  const toggleItem = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
  };

  if (!visible) return null;

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }} edges={['top']}>
        <View style={colStyles.createHeader}>
          <Pressable onPress={onClose}>
            <Text style={colStyles.createCancel}>Cancel</Text>
          </Pressable>
          <Text style={colStyles.createTitle}>New Collection</Text>
          <Pressable onPress={() => { if (name.trim()) onSave(name.trim(), description.trim(), selectedIds); }}
            disabled={!name.trim()}>
            <Text style={[colStyles.createSave, !name.trim() && { opacity: 0.4 }]}>Create</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 80 }}>
          <Text style={colStyles.fieldLabel}>Name</Text>
          <TextInput style={colStyles.fieldInput} value={name} onChangeText={setName}
            placeholder="e.g. Summer Essentials" placeholderTextColor={Colors.textTertiary} />
          <Text style={colStyles.fieldLabel}>Description (optional)</Text>
          <TextInput style={[colStyles.fieldInput, { minHeight: 60, textAlignVertical: 'top' }]}
            value={description} onChangeText={setDescription} multiline
            placeholder="What's this collection about?" placeholderTextColor={Colors.textTertiary} />
          <Text style={colStyles.fieldLabel}>Select Items ({selectedIds.length})</Text>
          <View style={colStyles.itemGrid}>
            {items.map((item) => {
              const selected = selectedIds.includes(item.id);
              return (
                <Pressable key={item.id}
                  style={[colStyles.itemTile, selected && colStyles.itemTileSelected]}
                  onPress={() => toggleItem(item.id)}>
                  <Image source={{ uri: item.clean_image_url || item.image_url }}
                    style={colStyles.itemTileImage} contentFit="contain" />
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function EditItemModal({ item, onClose, onSave, onDelete }: {
  item: ClosetItem | null;
  onClose: () => void;
  onSave: (id: string, updates: Partial<ClosetItem>) => void;
  onDelete: (item: ClosetItem) => void;
}) {
  const Colors = useThemeColors();
  const editStyles = useMemo(() => createEditStyles(Colors), [Colors]);
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
              <Image source={{ uri: item.clean_image_url || item.image_url }} style={editStyles.previewImage} contentFit="contain" />
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

function createEditStyles(C: ReturnType<typeof useThemeColors>) { return StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: { backgroundColor: C.cardSurface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%', paddingBottom: 40 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.textTertiary, alignSelf: 'center', marginTop: 10, marginBottom: 8 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  headerTitle: { fontFamily: Typography.bodyFamilyBold, fontSize: 17, color: C.textPrimary },
  body: { paddingHorizontal: 20, paddingTop: 16 },
  imagePreview: { width: 120, height: 120, backgroundColor: '#FFFFFF', borderRadius: Radius.lg, alignSelf: 'center', marginBottom: 20, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  previewImage: { width: '85%', height: '85%' },
  fieldLabel: { fontFamily: Typography.bodyFamilyMedium, fontSize: 13, color: C.textSecondary, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: C.cardSurfaceAlt, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 12, fontFamily: Typography.bodyFamily, fontSize: 15, color: C.textPrimary, borderWidth: 1, borderColor: C.border },
  actions: { marginTop: 28, gap: 12, paddingBottom: 20 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.accentGreen, paddingVertical: 14, borderRadius: Radius.pill },
  saveBtnText: { fontFamily: Typography.bodyFamilyBold, fontSize: 15, color: C.background },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: Radius.pill, borderWidth: 1, borderColor: C.accentCoral, backgroundColor: 'rgba(232, 90, 79, 0.08)' },
  deleteBtnText: { fontFamily: Typography.bodyFamilyBold, fontSize: 15, color: C.accentCoral },
}); }

function createFitModalStyles(C: ReturnType<typeof useThemeColors>) { return StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: { backgroundColor: C.cardSurface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.textTertiary, alignSelf: 'center', marginTop: 10, marginBottom: 8 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  title: { fontFamily: Typography.bodyFamilyBold, fontSize: 18, color: C.textPrimary },
  subtitle: { fontFamily: Typography.bodyFamily, fontSize: 13, color: C.textSecondary, marginTop: 2, textTransform: 'capitalize' },
  canvasPreview: { marginHorizontal: 20, marginVertical: 16, backgroundColor: '#FFFFFF', borderRadius: Radius.lg, overflow: 'hidden', aspectRatio: 3 / 4, maxHeight: 420 },
  collageImage: { width: '100%', height: '100%' },
  mannequinStack: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 16, paddingHorizontal: 12 },
  mannequinSlot: { width: '70%', alignItems: 'center' },
  mannequinImage: { width: '100%', height: 100 },
  slotLabel: { fontFamily: Typography.bodyFamily, fontSize: 10, color: C.textTertiary, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 12, paddingHorizontal: 20 },
  loadBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.accentGreen, paddingVertical: 14, borderRadius: Radius.pill },
  loadBtnText: { fontFamily: Typography.bodyFamilyBold, fontSize: 15, color: C.background },
  deleteBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderRadius: Radius.pill, borderWidth: 1, borderColor: C.accentCoral, backgroundColor: 'rgba(232, 90, 79, 0.08)' },
  deleteBtnText: { fontFamily: Typography.bodyFamilyBold, fontSize: 13, color: C.accentCoral },
}); }

function createColStyles(C: ReturnType<typeof useThemeColors>) { return StyleSheet.create({
  card: { flex: 1, backgroundColor: C.cardSurface, borderRadius: Radius.lg, borderWidth: 1, borderColor: C.border, overflow: 'hidden', marginBottom: 12 },
  coverFrame: { aspectRatio: 1, backgroundColor: C.cardSurfaceAlt },
  coverImage: { width: '100%', height: '100%' },
  coverPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  name: { fontFamily: Typography.bodyFamilyBold, fontSize: 13, color: C.textPrimary, paddingHorizontal: 10, paddingTop: 8 },
  count: { fontFamily: Typography.bodyFamily, fontSize: 11, color: C.textSecondary, paddingHorizontal: 10, paddingBottom: 10 },
  createBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, marginBottom: 8 },
  createBtnText: { fontFamily: Typography.bodyFamilyMedium, fontSize: 14, color: C.accentGreen },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  modalSheet: { backgroundColor: C.cardSurface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%', paddingBottom: 40 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.textTertiary, alignSelf: 'center', marginTop: 10, marginBottom: 8 },
  modalHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  modalTitle: { fontFamily: Typography.bodyFamilyBold, fontSize: 18, color: C.textPrimary },
  modalDesc: { fontFamily: Typography.bodyFamily, fontSize: 13, color: C.textSecondary, marginTop: 2 },
  editSheet: { backgroundColor: C.cardSurface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40, gap: 4 },
  editAction: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  editActionText: { fontFamily: Typography.bodyFamilyMedium, fontSize: 16, color: C.textPrimary },
  editCancel: { alignItems: 'center', paddingVertical: 16, marginTop: 4 },
  editCancelText: { fontFamily: Typography.bodyFamilyBold, fontSize: 16, color: C.textSecondary },
  createHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  createCancel: { fontFamily: Typography.bodyFamily, fontSize: 16, color: C.textSecondary },
  createTitle: { fontFamily: Typography.bodyFamilyBold, fontSize: 17, color: C.textPrimary },
  createSave: { fontFamily: Typography.bodyFamilyBold, fontSize: 16, color: C.accentGreen },
  fieldLabel: { fontFamily: Typography.bodyFamilyMedium, fontSize: 13, color: C.textSecondary, marginBottom: 6, marginTop: 16 },
  fieldInput: { backgroundColor: C.cardSurfaceAlt, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 12, fontFamily: Typography.bodyFamily, fontSize: 15, color: C.textPrimary, borderWidth: 1, borderColor: C.border },
  itemGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  itemTile: { width: 64, height: 64, borderRadius: 8, backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: C.border, overflow: 'hidden' },
  itemTileSelected: { borderColor: C.accentGreen },
  itemTileImage: { width: '100%', height: '100%' },
}); }

function createStyles(C: ReturnType<typeof useThemeColors>) { return StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
  topTabs: { flexDirection: 'row', paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  topTab: { flex: 1, alignItems: 'center', paddingVertical: 12, position: 'relative' },
  topTabText: { fontFamily: Typography.bodyFamilyMedium, fontSize: 15, color: C.textTertiary },
  topTabTextActive: { fontFamily: Typography.bodyFamilyBold, color: C.textPrimary },
  topTabIndicator: { position: 'absolute', bottom: 0, left: 16, right: 16, height: 2, backgroundColor: C.textPrimary, borderRadius: 1 },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginTop: 10, marginBottom: 4, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: C.cardSurfaceAlt, borderRadius: Radius.pill, borderWidth: 1, borderColor: C.border },
  searchInput: { flex: 1, fontFamily: Typography.bodyFamily, fontSize: 14, color: C.textPrimary, padding: 0 },
  filterWrapper: { borderBottomWidth: 1, borderBottomColor: C.border },
  filterRow: { paddingHorizontal: 16, paddingVertical: 10, gap: 8, alignItems: 'center' },
  filterPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.pill, backgroundColor: C.cardSurfaceAlt, borderWidth: 1, borderColor: C.border, height: 36 },
  filterPillActive: { backgroundColor: C.textPrimary, borderColor: C.textPrimary },
  filterPillOpen: { borderColor: C.accentBlue },
  filterPillText: { fontFamily: Typography.bodyFamilyMedium, fontSize: 13, color: C.textSecondary, textTransform: 'capitalize' },
  filterPillTextActive: { color: C.background },
  clearBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: C.cardSurfaceAlt, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  dropdownPanel: { backgroundColor: C.cardSurface, borderBottomWidth: 1, borderBottomColor: C.border },
  dropdownRow: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  dropdownEmpty: { fontFamily: Typography.bodyFamily, fontSize: 13, color: C.textTertiary },
  dropdownChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.pill, backgroundColor: C.cardSurfaceAlt, borderWidth: 1, borderColor: C.border },
  dropdownChipActive: { backgroundColor: C.accentBlue, borderColor: C.accentBlue },
  dropdownChipText: { fontFamily: Typography.bodyFamilyMedium, fontSize: 13, color: C.textSecondary, textTransform: 'capitalize' },
  dropdownChipTextActive: { color: C.textPrimary },
  gridContent: { paddingBottom: 120 },
  gridRow: { gap: GRID_GAP },
  gridItem: { width: ITEM_SIZE, height: ITEM_SIZE, backgroundColor: '#FFFFFF', marginBottom: GRID_GAP },
  gridImage: { width: '100%', height: '100%' },
  fab: { position: 'absolute', bottom: 110, alignSelf: 'center', width: 56, height: 56, borderRadius: 28, backgroundColor: C.accentGreen, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 12 },
  emptyTitle: { fontFamily: Typography.bodyFamilyBold, fontSize: 18, color: C.textPrimary },
  emptySubtitle: { fontFamily: Typography.bodyFamily, fontSize: 14, color: C.textSecondary, textAlign: 'center', lineHeight: 20 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 12, borderRadius: Radius.pill, backgroundColor: C.accentGreen, marginTop: 8 },
  emptyBtnText: { fontFamily: Typography.bodyFamilyBold, fontSize: 14, color: C.background },
  fitsContainer: { flex: 1 },
  fitPreviewCard: { flex: 1, backgroundColor: C.cardSurface, borderRadius: Radius.md, borderWidth: 1, borderColor: C.border, overflow: 'hidden', marginBottom: 6 },
  fitStackPreview: { aspectRatio: 3 / 4, backgroundColor: '#FFFFFF', borderTopLeftRadius: Radius.lg, borderTopRightRadius: Radius.lg, overflow: 'hidden' },
  fitCollageImage: { width: '100%', height: '100%' },
  fitMannequinStack: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 8 },
  fitMannequinSlot: { width: '75%', alignItems: 'center' },
  fitMannequinImage: { width: '100%', height: 80 },
  fitEmptySlot: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  fitPreviewTitle: { fontFamily: Typography.bodyFamilyBold, fontSize: 11, color: C.textPrimary, paddingHorizontal: 6, paddingTop: 4 },
  fitPreviewSub: { fontFamily: Typography.bodyFamily, fontSize: 10, color: C.textSecondary, paddingHorizontal: 6, paddingBottom: 6, textTransform: 'capitalize' },
}); }
