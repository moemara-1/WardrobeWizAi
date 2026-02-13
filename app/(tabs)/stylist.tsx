import { AddMenuPopover } from '@/components/ui/AddMenuPopover';
import { ClosetPickerSheet } from '@/components/ui/ClosetPickerSheet';
import { OutfitFilters } from '@/components/ui/OutfitFilters';
import { Radius, Typography } from '@/constants/Colors';
import { useThemeColors } from '@/contexts/ThemeContext';
import { generateOutfitTwin, OutfitTwinItem } from '@/lib/ai';
import { classifyGarmentSlot, GarmentSlot } from '@/lib/backgroundRemoval';
import { useClosetStore } from '@/stores/closetStore';
import { ClosetItem, ClothingCategory, Outfit } from '@/types';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router, type Href } from 'expo-router';
import {
  Bookmark,
  BookmarkCheck,
  Dices,
  Plus,
  Send,
  SlidersHorizontal,
  Sparkles
} from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Modal,
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
  const Colors = useThemeColors();
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [styleFilter, setStyleFilter] = useState<string[]>([]);
  const [colorFilter, setColorFilter] = useState<string[]>([]);
  const [weatherFilter, setWeatherFilter] = useState<string[]>([]);
  const [layoutFilter, setLayoutFilter] = useState('4pieces');
  const [showClosetPicker, setShowClosetPicker] = useState(false);
  const [closetPickerCategory, setClosetPickerCategory] = useState<ClothingCategory | undefined>();
  const [closetPickerTitle, setClosetPickerTitle] = useState('Add from Closet');
  const [chatMessage, setChatMessage] = useState('');
  const [savedThisOutfit, setSavedThisOutfit] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedAccessories, setSelectedAccessories] = useState<ClosetItem[]>([]);
  const [showFitsPicker, setShowFitsPicker] = useState(false);

  // Each slot tracks which item index is currently shown
  const [slotIndices, setSlotIndices] = useState<Record<GarmentSlot, number>>({
    headwear: 0, top: 0, bottom: 0, footwear: 0, accessory: 0, 'full-body': 0, unknown: 0,
  });

  const items = useClosetStore((s) => s.items);
  const outfits = useClosetStore((s) => s.outfits);
  const addOutfit = useClosetStore((s) => s.addOutfit);
  const digitalTwin = useClosetStore((s) => s.digitalTwin);
  const setTwinGenerating = useClosetStore((s) => s.setTwinGenerating);
  const setTwinProgress = useClosetStore((s) => s.setTwinProgress);
  const setDigitalTwin = useClosetStore((s) => s.setDigitalTwin);
  const canvasItem = useClosetStore((s) => s.canvasItem);
  const clearCanvasItem = useClosetStore((s) => s.clearCanvasItem);
  const canvasOutfit = useClosetStore((s) => s.canvasOutfit);
  const clearCanvasOutfit = useClosetStore((s) => s.clearCanvasOutfit);

  const styles = useMemo(() => createStylistStyles(Colors), [Colors]);

  // Consume canvasItem passed from item detail "Try on Canvas"
  useEffect(() => {
    if (canvasItem) {
      const { slot, item: passedItem } = canvasItem;
      const slotItems = itemsBySlot[slot as GarmentSlot];
      const idx = slotItems.findIndex((i) => i.id === passedItem.id);
      if (idx >= 0) {
        setSlotIndices((prev) => ({ ...prev, [slot]: idx }));
      }
      clearCanvasItem();
    }
  }, [canvasItem]);

  // Consume canvasOutfit passed from closet fits "Load to Canvas"
  useEffect(() => {
    if (canvasOutfit) {
      const resolvedItems = canvasOutfit.item_ids
        .map((oid) => items.find((i) => i.id === oid))
        .filter(Boolean) as ClosetItem[];

      const newIndices = { ...slotIndices };
      for (const piece of resolvedItems) {
        const slot = classifyGarmentSlot(piece.category, piece.garment_type || undefined);
        // Outfit slots by category
        const slotItems = itemsBySlot[slot];
        const idx = slotItems.findIndex((i) => i.id === piece.id);
        if (idx >= 0) {
          newIndices[slot] = idx;
        }
      }
      setSlotIndices(newIndices);
      clearCanvasOutfit();
    }
  }, [canvasOutfit]);

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

  // Multi-filter item scoring (style + color + weather)
  const filteredItemsBySlot = useMemo(() => {
    const hasFilters = styleFilter.length > 0 || colorFilter.length > 0 || weatherFilter.length > 0;
    if (!hasFilters) return itemsBySlot;

    // Style tags
    const styleTags: Record<string, string[]> = {
      casual: ['casual', 'everyday', 'relaxed', 'basic'],
      streetwear: ['street', 'streetwear', 'urban', 'graphic', 'oversized'],
      'smart-casual': ['smart', 'polished', 'chino', 'blazer', 'loafer'],
      athleisure: ['athletic', 'sport', 'gym', 'jogger', 'sneaker', 'track'],
      formal: ['formal', 'dress', 'suit', 'elegant', 'tailored'],
      'going-out': ['going out', 'night', 'party', 'club', 'evening', 'glam'],
    };

    // Color palette families
    const colorFamilies: Record<string, string[]> = {
      light: ['white', 'cream', 'beige', 'ivory', 'light', 'pastel', 'lavender', 'pink', 'sky'],
      dark: ['black', 'navy', 'charcoal', 'dark', 'deep', 'midnight'],
      bright: ['red', 'orange', 'yellow', 'bright', 'neon', 'vivid', 'electric'],
      monochrome: ['black', 'white', 'grey', 'gray', 'charcoal', 'silver'],
      colorful: ['multicolor', 'pattern', 'print', 'colorful', 'stripe', 'plaid', 'floral'],
    };

    // Weather tags
    const weatherTags: Record<string, string[]> = {
      cold: ['winter', 'warm', 'cozy', 'wool', 'fleece', 'heavy'],
      warm: ['spring', 'fall', 'light', 'layer', 'cotton'],
      hot: ['summer', 'light', 'breathable', 'linen', 'short'],
      snow: ['winter', 'waterproof', 'insulated', 'warm', 'heavy'],
      rain: ['waterproof', 'rain', 'resistant'],
      indoor: ['casual', 'comfort', 'lounge'],
      transitional: ['layer', 'versatile', 'light'],
    };

    const activeStyleTags = styleFilter.flatMap(s => styleTags[s] || []);
    const activeColorTags = colorFilter.flatMap(c => colorFamilies[c] || []);
    const activeWeatherTags = weatherFilter.flatMap(w => weatherTags[w] || []);

    const filtered: Record<GarmentSlot, ClosetItem[]> = {
      headwear: [], top: [], bottom: [], footwear: [], accessory: [], 'full-body': [], unknown: [],
    };

    for (const [slot, slotItems] of Object.entries(itemsBySlot)) {
      const scored = slotItems.map(item => {
        const itemTags = [...(item.tags || []), item.category, item.garment_type || ''].map(t => t.toLowerCase());
        const itemColors = (item.colors || []).map(c => c.toLowerCase());
        const allSearchable = [...itemTags, ...itemColors, (item.name || '').toLowerCase()];

        let score = 0;
        if (activeStyleTags.length > 0)
          score += activeStyleTags.filter(tag => allSearchable.some(s => s.includes(tag))).length;
        if (activeColorTags.length > 0)
          score += activeColorTags.filter(tag => allSearchable.some(s => s.includes(tag))).length;
        if (activeWeatherTags.length > 0)
          score += activeWeatherTags.filter(tag => allSearchable.some(s => s.includes(tag))).length;

        return { item, score };
      });
      scored.sort((a, b) => b.score - a.score);
      filtered[slot as GarmentSlot] = scored.map(s => s.item);
    }

    return filtered;
  }, [itemsBySlot, styleFilter, colorFilter, weatherFilter]);

  // Determine visible slots based on layout filter
  const visibleSlots = useMemo(() => {
    switch (layoutFilter) {
      case '3pieces':
        return OUTFIT_SLOTS.filter(s => s.slot !== 'headwear');
      case '2pieces':
        return OUTFIT_SLOTS.filter(s => s.slot === 'top' || s.slot === 'bottom');
      case 'full':
        return [{ slot: 'full-body' as GarmentSlot, label: 'Full Outfit', heightRatio: 1.0, category: 'dress' as ClothingCategory }];
      case '4pieces':
      default:
        return OUTFIT_SLOTS;
    }
  }, [layoutFilter]);

  // Get currently selected item for each slot
  const getSlotItem = useCallback((slot: GarmentSlot): ClosetItem | null => {
    const slotItems = filteredItemsBySlot[slot];
    if (slotItems.length === 0) return null;
    const idx = slotIndices[slot] % slotItems.length;
    return slotItems[idx] || null;
  }, [filteredItemsBySlot, slotIndices]);

  // Swipe to next/prev item in a slot with animation
  const swipeAnimValues = useRef<Record<string, Animated.Value>>(
    Object.fromEntries(OUTFIT_SLOTS.map(({ slot }) => [slot, new Animated.Value(0)]))
  ).current;

  const swipeSlot = useCallback((slot: GarmentSlot, direction: 1 | -1) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const count = filteredItemsBySlot[slot].length;
    if (count === 0) return;
    const anim = swipeAnimValues[slot];
    // Animate out
    Animated.timing(anim, {
      toValue: direction * -120,
      duration: 120,
      useNativeDriver: true,
    }).start(() => {
      // Switch item
      setSlotIndices((prev) => ({
        ...prev,
        [slot]: (prev[slot] + direction + count) % count,
      }));
      setSavedThisOutfit(false);
      // Reset to offscreen opposite side, then animate in
      anim.setValue(direction * 120);
      Animated.spring(anim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 120,
        friction: 14,
      }).start();
    });
  }, [filteredItemsBySlot, swipeAnimValues]);

  // Pan responders for each slot to detect horizontal swipes
  const swipeSlotRef = useRef(swipeSlot);
  swipeSlotRef.current = swipeSlot;
  const itemsBySlotRef = useRef(filteredItemsBySlot);
  itemsBySlotRef.current = filteredItemsBySlot;

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
    visibleSlots.some(({ slot }) => filteredItemsBySlot[slot].length > 0),
    [filteredItemsBySlot, visibleSlots]
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
    for (const { slot } of visibleSlots) {
      const count = filteredItemsBySlot[slot].length;
      if (count > 0) {
        newIndices[slot] = Math.floor(Math.random() * count);
      }
    }
    setSlotIndices(newIndices);
    setTimeout(() => setIsGenerating(false), 300);
  }, [hasAnyItems, filteredItemsBySlot, visibleSlots, slotIndices]);

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
      // Add tops / bottoms / headwear / shoes to canvas
      setClosetPickerCategory(undefined);
      setClosetPickerTitle('Add Piece');
      setShowClosetPicker(true);
    } else if (action === 'accessories') {
      // Add accessories (bags, jewelry, etc.) — tracked for AI, not on canvas
      setClosetPickerCategory('accessory' as ClothingCategory);
      setClosetPickerTitle('Select Accessories');
      setShowClosetPicker(true);
    } else if (action === 'fits') {
      // Show saved outfits picker
      if (outfits.length === 0) {
        Alert.alert('No saved fits', 'Save outfits from the canvas first to load them here.');
        return;
      }
      setShowFitsPicker(true);
    }
  }, [outfits]);

  // Load a saved outfit onto the canvas
  const handleLoadFit = useCallback((outfit: Outfit) => {
    setShowFitsPicker(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSavedThisOutfit(false);

    for (const item of outfit.items) {
      const slot = classifyGarmentSlot(item.category, item.garment_type || undefined);
      const slotItems = itemsBySlot[slot];
      const idx = slotItems.findIndex((si) => si.id === item.id);
      if (idx >= 0) {
        setSlotIndices((prev) => ({ ...prev, [slot]: idx }));
      }
    }
  }, [itemsBySlot]);

  // Handle closet picker selection — place item in matching slot or track accessories
  const handleClosetSelect = useCallback((selected: ClosetItem[]) => {
    setShowClosetPicker(false);
    if (selected.length === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSavedThisOutfit(false);

    // If accessories mode, just track them for AI context
    if (closetPickerCategory === ('accessory' as ClothingCategory)) {
      setSelectedAccessories(selected);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return;
    }

    for (const item of selected) {
      const slot = classifyGarmentSlot(item.category, item.garment_type || undefined);
      const slotItems = itemsBySlot[slot];
      const idx = slotItems.findIndex((si) => si.id === item.id);
      if (idx >= 0) {
        setSlotIndices((prev) => ({ ...prev, [slot]: idx }));
      }
    }
  }, [itemsBySlot, closetPickerCategory]);

  const handleSend = useCallback(async () => {
    if (!chatMessage.trim() && currentOutfitItems.length === 0) return;
    if (!digitalTwin?.twin_image_url) {
      Alert.alert(
        'Generate your twin first',
        'Go to your profile and create a digital twin before trying on outfits.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Set Up', onPress: () => router.push('/digital-twin' as Href) },
        ],
      );
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Build outfit items list with their images for the AI
    const allItems = [...currentOutfitItems, ...selectedAccessories];
    const outfitItemsForAI: OutfitTwinItem[] = allItems.map(item => ({
      name: item.name,
      category: item.category,
      imageUri: item.clean_image_url || item.image_url,
    }));

    const scenePrompt = chatMessage.trim() || undefined;
    setChatMessage('');

    // Generate in background
    setTwinGenerating(true);
    setTwinProgress('Dressing your twin in this fit...');

    try {
      const newTwinImageUrl = await generateOutfitTwin(
        digitalTwin.twin_image_url,
        outfitItemsForAI,
        scenePrompt,
      );

      setDigitalTwin({
        ...digitalTwin,
        twin_image_url: newTwinImageUrl,
        updated_at: new Date().toISOString(),
      });
      setTwinProgress('New fit generated!');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => setTwinGenerating(false), 2000);
    } catch (e: any) {
      setTwinGenerating(false);
      setTwinProgress(null);
      Alert.alert('Generation failed', e?.message || 'Something went wrong');
    }
  }, [chatMessage, currentOutfitItems, selectedAccessories, digitalTwin, setTwinGenerating, setTwinProgress, setDigitalTwin]);

  const handleOpenStyleChat = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/style-chat' as Href);
  };

  const twinGenerating = useClosetStore((s) => s.twinGenerating);
  const twinProgress = useClosetStore((s) => s.twinProgress);

  // Accessory indicator for canvas/chat (shows which accessories are selected for AI)
  const accessoryCount = selectedAccessories.length;

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
            router.push('/digital-twin' as Href);
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
      <View style={styles.canvasArea}>
        <View style={styles.canvas}>
          {hasAnyItems ? (
            <View style={styles.slotsColumn}>
              {visibleSlots.map(({ slot, label, heightRatio, category }) => {
                const slotItems = filteredItemsBySlot[slot];
                const currentItem = getSlotItem(slot);

                return (
                  <View key={slot} style={[styles.slotRow, { flex: heightRatio }]} {...slotPanResponders[slot].panHandlers}>
                    <View style={styles.slotCenter}>
                      {currentItem ? (
                        <Animated.View style={[styles.slotImageWrapper, { transform: [{ translateX: swipeAnimValues[slot] }] }]}>
                          <Pressable
                            onPress={() => {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                              router.push(`/item/${currentItem.id}` as Href);
                            }}
                            style={styles.slotImagePressable}
                          >
                            <Image
                              source={{ uri: currentItem.clean_image_url || currentItem.image_url }}
                              style={styles.slotImage}
                              contentFit="contain"
                            />
                          </Pressable>
                        </Animated.View>
                      ) : (
                        <View style={styles.slotEmptySpace} />
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
      </View>

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
        <Pressable style={[styles.fab, savedThisOutfit && styles.fabSaved]} onPress={handleSave}>
          {savedThisOutfit
            ? <BookmarkCheck size={20} color={Colors.accentGreen} />
            : <Bookmark size={20} color={Colors.textPrimary} />
          }
        </Pressable>
      </View>

      {/* Chat bar at bottom */}
      <SafeAreaView edges={['bottom']} style={styles.chatBarWrapper}>
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
      </SafeAreaView>

      <OutfitFilters
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        onApply={(filters) => {
          setStyleFilter(filters.style);
          setColorFilter(filters.color);
          setWeatherFilter(filters.weather);
          setLayoutFilter(filters.layout);
          setShowFilters(false);
        }}
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
        multiSelect={closetPickerCategory === ('accessory' as ClothingCategory)}
      />

      {/* Saved Fits Picker */}
      <Modal visible={showFitsPicker} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.fitsPickerContainer} edges={['top']}>
          <View style={styles.fitsPickerHeader}>
            <Pressable onPress={() => setShowFitsPicker(false)} style={styles.fitsPickerClose}>
              <Text style={styles.fitsPickerCloseText}>Cancel</Text>
            </Pressable>
            <Text style={styles.fitsPickerTitle}>Load Saved Fit</Text>
            <View style={{ width: 64 }} />
          </View>
          <FlatList
            data={outfits}
            keyExtractor={(o) => o.id}
            contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
            renderItem={({ item: outfit }) => (
              <Pressable style={styles.fitsPickerCard} onPress={() => handleLoadFit(outfit)}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.fitsPickerItems}>
                  {outfit.items.slice(0, 5).map((piece) => (
                    <View key={piece.id} style={styles.fitsPickerThumb}>
                      <Image source={{ uri: piece.clean_image_url || piece.image_url }} style={styles.fitsPickerImage} contentFit="contain" />
                    </View>
                  ))}
                </ScrollView>
                <Text style={styles.fitsPickerName}>{outfit.name}</Text>
                <Text style={styles.fitsPickerSub}>{outfit.items.length} pieces</Text>
              </Pressable>
            )}
          />
        </SafeAreaView>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function createStylistStyles(C: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.background },
    topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 8 },
    topBarBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: C.cardSurfaceAlt, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
    titlePill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.textPrimary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: Radius.pill },
    titleText: { fontFamily: Typography.bodyFamilyBold, fontSize: 14, color: C.background },
    avatarCircle: { width: 42, height: 42, borderRadius: 21, backgroundColor: C.cardSurfaceAlt, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
    avatarText: { fontFamily: Typography.bodyFamilyBold, fontSize: 14, color: C.textSecondary },
    twinBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginTop: 4, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: C.cardSurfaceAlt, borderRadius: Radius.md, borderWidth: 1, borderColor: C.border },
    twinBannerText: { fontFamily: Typography.bodyFamilyMedium, fontSize: 13, color: C.textSecondary },
    canvasArea: { flex: 1, marginHorizontal: 16, marginTop: 8, marginBottom: 8 },
    canvas: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: Radius.lg, overflow: 'hidden' },
    canvasPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
    canvasTitle: { fontFamily: Typography.serifFamilyBold, fontSize: 18, color: C.textTertiary },
    canvasSubtitle: { fontFamily: Typography.bodyFamily, fontSize: 13, color: C.textTertiary, textAlign: 'center' },
    slotsColumn: { flex: 1, paddingVertical: 12, paddingHorizontal: 8 },
    slotRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    slotCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    slotImageWrapper: { width: '65%', height: '100%', alignItems: 'center', justifyContent: 'center' },
    slotImagePressable: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
    slotImage: { width: '100%', height: '100%' },
    slotEmptySpace: { width: 40, height: 40 },
    fabColumn: { position: 'absolute', right: 28, bottom: 220, gap: 12 },
    fabPlus: { width: 48, height: 48, borderRadius: 24, backgroundColor: C.accentGreen, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 },
    fab: { width: 48, height: 48, borderRadius: 24, backgroundColor: C.cardSurfaceAlt, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 },
    fabSaved: { borderColor: C.accentGreen },
    chatBarWrapper: { paddingHorizontal: 16, paddingBottom: 80, paddingTop: 4 },
    chatBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.cardSurfaceAlt, borderRadius: Radius.pill, paddingHorizontal: 6, paddingVertical: 6, gap: 8, borderWidth: 1, borderColor: C.border },
    chatPlusBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.cardSurface, alignItems: 'center', justifyContent: 'center' },
    chatInput: { flex: 1, fontFamily: Typography.bodyFamily, fontSize: 13, color: C.textPrimary, paddingVertical: 0 },
    sendBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.accentGreen, alignItems: 'center', justifyContent: 'center' },
    fitsPickerContainer: { flex: 1, backgroundColor: C.background },
    fitsPickerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
    fitsPickerClose: { paddingHorizontal: 8, paddingVertical: 4 },
    fitsPickerCloseText: { fontFamily: Typography.bodyFamilyMedium, fontSize: 15, color: C.textSecondary },
    fitsPickerTitle: { fontFamily: Typography.bodyFamilyBold, fontSize: 16, color: C.textPrimary },
    fitsPickerCard: { marginBottom: 16, padding: 16, backgroundColor: '#FFFFFF', borderRadius: Radius.lg, borderWidth: 1, borderColor: C.border },
    fitsPickerItems: { flexDirection: 'row', marginBottom: 10 },
    fitsPickerThumb: { width: 60, height: 60, marginRight: 8, backgroundColor: '#FFFFFF', borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
    fitsPickerImage: { width: '90%', height: '90%' },
    fitsPickerName: { fontFamily: Typography.bodyFamilyBold, fontSize: 15, color: C.textPrimary },
    fitsPickerSub: { fontFamily: Typography.bodyFamily, fontSize: 12, color: C.textSecondary, marginTop: 2 },
  });
}
