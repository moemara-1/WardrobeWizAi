import { AddMenuPopover } from '@/components/ui/AddMenuPopover';
import { ClosetPickerSheet } from '@/components/ui/ClosetPickerSheet';
import { OutfitFilters } from '@/components/ui/OutfitFilters';
import { Colors, Radius, Typography } from '@/constants/Colors';
import { classifyGarmentSlot, GarmentSlot } from '@/lib/backgroundRemoval';
import { useClosetStore } from '@/stores/closetStore';
import { ClothingCategory, ClosetItem, Outfit } from '@/types';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import {
    Bookmark,
    BookmarkCheck,
    Dices,
    Plus,
    ScanLine,
    Send,
    SlidersHorizontal,
    Sparkles
} from 'lucide-react-native';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    PanResponder,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Slot definitions in vertical order (top to bottom on the board)
const OUTFIT_SLOTS: { slot: GarmentSlot; label: string; heightRatio: number; category?: ClothingCategory }[] = [
  { slot: 'headwear', label: 'Headwear', heightRatio: 0.18, category: 'hat' },
  { slot: 'top', label: 'Top', heightRatio: 0.32, category: 'top' },
  { slot: 'bottom', label: 'Bottom', heightRatio: 0.28, category: 'bottom' },
  { slot: 'footwear', label: 'Footwear', heightRatio: 0.22, category: 'shoe' },
];

export default function StylistScreen() {
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showClosetPicker, setShowClosetPicker] = useState(false);
  const [closetPickerCategory, setClosetPickerCategory] = useState<ClothingCategory | undefined>();
  const [closetPickerTitle, setClosetPickerTitle] = useState('Add from Closet');
  const [chatMessage, setChatMessage] = useState('');
  const [savedThisOutfit, setSavedThisOutfit] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Each slot tracks which item index is currently shown
  const [slotIndices, setSlotIndices] = useState<Record<GarmentSlot, number>>({
    headwear: 0, top: 0, bottom: 0, footwear: 0, accessory: 0, 'full-body': 0, unknown: 0,
  });

  const items = useClosetStore((s) => s.items);
  const addOutfit = useClosetStore((s) => s.addOutfit);

  // Group closet items by garment slot
  const itemsBySlot = useMemo(() => {
    const grouped: Record<GarmentSlot, ClosetItem[]> = {
      headwear: [], top: [], bottom: [], footwear: [], accessory: [], 'full-body': [], unknown: [],
    };
    for (const item of items) {
      const slot = classifyGarmentSlot(item.category, item.garment_type || undefined);
      grouped[slot].push(item);
    }
    return grouped;
  }, [items]);

  // Get currently selected item for each slot
  const getSlotItem = useCallback((slot: GarmentSlot): ClosetItem | null => {
    const slotItems = itemsBySlot[slot];
    if (slotItems.length === 0) return null;
    const idx = slotIndices[slot] % slotItems.length;
    return slotItems[idx] || null;
  }, [itemsBySlot, slotIndices]);

  // Swipe to next/prev item in a slot
  const swipeSlot = useCallback((slot: GarmentSlot, direction: 1 | -1) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const count = itemsBySlot[slot].length;
    if (count === 0) return;
    setSlotIndices((prev) => ({
      ...prev,
      [slot]: (prev[slot] + direction + count) % count,
    }));
    setSavedThisOutfit(false);
  }, [itemsBySlot]);

  // Pan responders for each slot to detect horizontal swipes
  const swipeSlotRef = useRef(swipeSlot);
  swipeSlotRef.current = swipeSlot;
  const itemsBySlotRef = useRef(itemsBySlot);
  itemsBySlotRef.current = itemsBySlot;

  const slotPanResponders = useMemo(() => {
    const responders: Record<string, ReturnType<typeof PanResponder.create>> = {};
    for (const { slot } of OUTFIT_SLOTS) {
      responders[slot] = PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gestureState) => {
          return Math.abs(gestureState.dx) > 15 && Math.abs(gestureState.dy) < Math.abs(gestureState.dx);
        },
        onPanResponderRelease: (_, gestureState) => {
          const count = itemsBySlotRef.current[slot].length;
          if (count <= 1) return;
          if (Math.abs(gestureState.dx) > 30) {
            swipeSlotRef.current(slot, gestureState.dx < 0 ? 1 : -1);
          }
        },
      });
    }
    return responders;
  }, []);

  // Get all current outfit items
  const currentOutfitItems = useMemo(() => {
    const outfitItems: ClosetItem[] = [];
    for (const { slot } of OUTFIT_SLOTS) {
      const item = getSlotItem(slot);
      if (item) outfitItems.push(item);
    }
    return outfitItems;
  }, [getSlotItem]);

  const hasAnyItems = useMemo(() =>
    OUTFIT_SLOTS.some(({ slot }) => itemsBySlot[slot].length > 0),
    [itemsBySlot]
  );

  // Randomize: pick random index for each slot
  const handleRandomize = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setSavedThisOutfit(false);

    if (!hasAnyItems) {
      Alert.alert('No items', 'Add items to your closet first to build outfits.');
      return;
    }

    setIsGenerating(true);
    const newIndices = { ...slotIndices };
    for (const { slot } of OUTFIT_SLOTS) {
      const count = itemsBySlot[slot].length;
      if (count > 0) {
        newIndices[slot] = Math.floor(Math.random() * count);
      }
    }
    setSlotIndices(newIndices);
    setTimeout(() => setIsGenerating(false), 300);
  }, [hasAnyItems, itemsBySlot, slotIndices]);

  // Save current outfit
  const handleSave = useCallback(() => {
    if (currentOutfitItems.length === 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert('No outfit', 'Swipe through items or tap dice to build an outfit first.');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSavedThisOutfit(true);

    const outfit: Outfit = {
      id: `outfit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      user_id: 'demo',
      items: currentOutfitItems,
      item_ids: currentOutfitItems.map((i) => i.id),
      name: `Outfit ${new Date().toLocaleDateString()}`,
      seasons: [],
      pinned: false,
      created_at: new Date().toISOString(),
    };

    addOutfit(outfit);
  }, [currentOutfitItems, addOutfit]);

  // Handle add menu item selection
  const handleAddMenuItem = useCallback((action: string) => {
    setShowAddMenu(false);
    if (action === 'pieces') {
      setClosetPickerCategory(undefined);
      setClosetPickerTitle('Add Piece');
      setShowClosetPicker(true);
    } else if (action === 'accessories') {
      setClosetPickerCategory('accessory' as ClothingCategory);
      setClosetPickerTitle('Add Accessory');
      setShowClosetPicker(true);
    } else if (action === 'fits') {
      router.push('/import-fit-pic' as never);
    }
  }, []);

  // Handle closet picker selection — place item in matching slot
  const handleClosetSelect = useCallback((selected: ClosetItem[]) => {
    setShowClosetPicker(false);
    if (selected.length === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSavedThisOutfit(false);

    for (const item of selected) {
      const slot = classifyGarmentSlot(item.category, item.garment_type || undefined);
      const slotItems = itemsBySlot[slot];
      const idx = slotItems.findIndex((si) => si.id === item.id);
      if (idx >= 0) {
        setSlotIndices((prev) => ({ ...prev, [slot]: idx }));
      }
    }
  }, [itemsBySlot]);

  const handleSend = () => {
    if (!chatMessage.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/style-chat' as never);
    setChatMessage('');
  };

  const handleOpenStyleChat = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/style-chat' as never);
  };

  const twinGenerating = useClosetStore((s) => s.twinGenerating);
  const twinProgress = useClosetStore((s) => s.twinProgress);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <SafeAreaView edges={['top']} style={styles.topBar}>
        <Pressable
          style={styles.topBarBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowFilters(true);
          }}
        >
          <SlidersHorizontal size={20} color={Colors.textPrimary} />
        </Pressable>

        <Pressable style={styles.titlePill} onPress={handleOpenStyleChat}>
          <Sparkles size={14} color={Colors.accentGreen} />
          <Text style={styles.titleText}>StyleAI</Text>
        </Pressable>

        <Pressable
          style={styles.avatarCircle}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/digital-twin' as never);
          }}
        >
          <Text style={styles.avatarText}>U</Text>
        </Pressable>
      </SafeAreaView>

      {twinGenerating && (
        <View style={styles.twinBanner}>
          <ActivityIndicator size="small" color={Colors.accentGreen} />
          <Text style={styles.twinBannerText}>{twinProgress || 'Generating twin...'}</Text>
        </View>
      )}

      {/* Outfit Canvas — vertical board layout */}
      <ScrollView style={styles.canvasScroll} contentContainerStyle={styles.canvasScrollContent}>
        <View style={styles.canvas}>
          {hasAnyItems ? (
            <View style={styles.slotsColumn}>
              {OUTFIT_SLOTS.map(({ slot, label, heightRatio, category }) => {
                const slotItems = itemsBySlot[slot];
                const currentItem = getSlotItem(slot);
                const count = slotItems.length;
                const currentIdx = count > 0 ? (slotIndices[slot] % count) : 0;

                return (
                  <View key={slot} style={[styles.slotRow, { flex: heightRatio }]} {...slotPanResponders[slot].panHandlers}>
                    <View style={styles.slotCenter}>
                      {currentItem ? (
                        <Pressable
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            router.push(`/item/${currentItem.id}` as never);
                          }}
                          style={styles.slotImageWrapper}
                        >
                          <Image
                            source={{ uri: currentItem.clean_image_url || currentItem.image_url }}
                            style={styles.slotImage}
                            resizeMode="contain"
                          />
                        </Pressable>
                      ) : (
                        <Pressable
                          style={styles.slotEmpty}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setClosetPickerCategory(category);
                            setClosetPickerTitle(`Add ${label}`);
                            setShowClosetPicker(true);
                          }}
                        >
                          <Plus size={20} color="#ccc" />
                        </Pressable>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.canvasPlaceholder}>
              <Sparkles size={32} color={Colors.textTertiary} strokeWidth={1.2} />
              <Text style={styles.canvasTitle}>Your Outfit Board</Text>
              <Text style={styles.canvasSubtitle}>
                Add items to your closet to start{'\n'}building outfits here
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* FABs on right side */}
      <View style={styles.fabColumn}>
        <Pressable
          style={styles.fabPlus}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setShowAddMenu(true);
          }}
        >
          <Plus size={22} color="#fff" />
        </Pressable>
        <Pressable
          style={[styles.fab, isGenerating && { opacity: 0.5 }]}
          onPress={handleRandomize}
          disabled={isGenerating}
        >
          <Dices size={20} color={Colors.textPrimary} />
        </Pressable>
        <Pressable style={[styles.fab, styles.fabScan]} onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push('/virtual-try-on' as never);
        }}>
          <ScanLine size={20} color={Colors.textPrimary} />
        </Pressable>
        <Pressable style={[styles.fab, savedThisOutfit && styles.fabSaved]} onPress={handleSave}>
          {savedThisOutfit
            ? <BookmarkCheck size={20} color={Colors.accentGreen} />
            : <Bookmark size={20} color={Colors.textPrimary} />
          }
        </Pressable>
      </View>

      {/* Chat bar at bottom */}
      <View style={styles.chatBarWrapper}>
        <View style={styles.chatBar}>
          <Pressable style={styles.chatPlusBtn} onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setShowAddMenu(true);
          }}>
            <Plus size={18} color={Colors.textSecondary} />
          </Pressable>
          <TextInput
            style={styles.chatInput}
            placeholder="Describe a scene or use 'Studio'..."
            placeholderTextColor={Colors.textTertiary}
            value={chatMessage}
            onChangeText={setChatMessage}
          />
          <Pressable style={styles.sendBtn} onPress={handleSend}>
            <Send size={16} color={Colors.background} />
          </Pressable>
        </View>
      </View>

      <OutfitFilters
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        onApply={() => setShowFilters(false)}
      />

      {showAddMenu && (
        <AddMenuPopover
          onClose={() => setShowAddMenu(false)}
          onSelect={handleAddMenuItem}
        />
      )}

      <ClosetPickerSheet
        visible={showClosetPicker}
        onClose={() => setShowClosetPicker(false)}
        onSelect={handleClosetSelect}
        filterCategory={closetPickerCategory}
        title={closetPickerTitle}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 8 },
  topBarBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: Colors.cardSurfaceAlt, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  titlePill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.textPrimary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: Radius.pill },
  titleText: { fontFamily: Typography.bodyFamilyBold, fontSize: 14, color: Colors.background },
  avatarCircle: { width: 42, height: 42, borderRadius: 21, backgroundColor: Colors.cardSurfaceAlt, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  avatarText: { fontFamily: Typography.bodyFamilyBold, fontSize: 14, color: Colors.textSecondary },
  twinBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginTop: 4, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: Colors.cardSurfaceAlt, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border },
  twinBannerText: { fontFamily: Typography.bodyFamilyMedium, fontSize: 13, color: Colors.textSecondary },
  canvasScroll: { flex: 1, marginHorizontal: 16, marginTop: 8, marginBottom: 8 },
  canvasScrollContent: { flexGrow: 1 },
  canvas: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: Radius.lg, overflow: 'hidden', minHeight: 500 },
  canvasPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  canvasTitle: { fontFamily: Typography.serifFamilyBold, fontSize: 18, color: Colors.textTertiary },
  canvasSubtitle: { fontFamily: Typography.bodyFamily, fontSize: 13, color: Colors.textTertiary, textAlign: 'center' },
  slotsColumn: { flex: 1, paddingVertical: 20, paddingHorizontal: 16, gap: 8 },
  slotRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minHeight: 60 },
  slotCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  slotImageWrapper: { width: '75%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  slotImage: { width: '100%', height: '100%' },
  slotEmpty: { alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: 24, borderWidth: 1.5, borderColor: '#E0E0E0', borderStyle: 'dashed' },
  fabColumn: { position: 'absolute', right: 28, bottom: 170, gap: 12 },
  fabPlus: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#32D583', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 },
  fab: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.cardSurfaceAlt, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 },
  fabSaved: { borderColor: Colors.accentGreen },
  fabScan: {},
  chatBarWrapper: { paddingHorizontal: 16, paddingBottom: 100, paddingTop: 4 },
  chatBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.cardSurfaceAlt, borderRadius: Radius.pill, paddingHorizontal: 6, paddingVertical: 6, gap: 8, borderWidth: 1, borderColor: Colors.border },
  chatPlusBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.cardSurface, alignItems: 'center', justifyContent: 'center' },
  chatInput: { flex: 1, fontFamily: Typography.bodyFamily, fontSize: 13, color: Colors.textPrimary, paddingVertical: 0 },
  sendBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.accentGreen, alignItems: 'center', justifyContent: 'center' },
});
