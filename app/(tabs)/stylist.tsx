import { AddMenuPopover } from '@/components/ui/AddMenuPopover';
import { ClosetPickerSheet } from '@/components/ui/ClosetPickerSheet';
import { OutfitFilters, type FilterState, type LayoutFilter } from '@/components/ui/OutfitFilters';
import { Radius, Typography } from '@/constants/Colors';
import { useThemeColors } from '@/contexts/ThemeContext';
import { generateOutfitTwin, generateSmartOutfit, OutfitTwinItem } from '@/lib/ai';
import { classifyGarmentSlot } from '@/lib/backgroundRemoval';
import { useClosetStore } from '@/stores/closetStore';
import { ClosetItem, ClothingCategory, GeneratedLook, Outfit } from '@/types';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router, type Href } from 'expo-router';
import {
  Bookmark,
  BookmarkCheck,
  ChevronLeft,
  ChevronRight,
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
  Dimensions,
  FlatList,
  GestureResponderEvent,
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

const CANVAS_ITEM_DEFAULT = 120;
const CANVAS_ITEM_MIN = 60;
const CANVAS_ITEM_MAX = 280;

const SLOT_ORDER = ['headwear', 'top', 'bottom', 'footwear'] as const;
const SWIPE_SLOT_ORDER = ['full-body', ...SLOT_ORDER] as const;

type StylistMode = 'canvas' | 'swipe';
type SwipeSlot = (typeof SWIPE_SLOT_ORDER)[number];

const SWIPE_LAYOUT_SLOTS: Record<LayoutFilter, SwipeSlot[]> = {
  'full-piece': ['full-body'],
  'two-piece': ['top', 'bottom'],
  'three-piece': ['headwear', 'top', 'bottom'],
  'four-piece': ['headwear', 'top', 'bottom', 'footwear'],
};

const LAYOUT_LABELS: Record<LayoutFilter, string> = {
  'full-piece': 'Full Piece',
  'two-piece': '2 Pieces',
  'three-piece': '3 Pieces',
  'four-piece': '4 Pieces',
};

const SLOT_LABELS: Record<SwipeSlot, string> = {
  'full-body': 'Full Piece',
  headwear: 'Headwear',
  top: 'Top',
  bottom: 'Bottom',
  footwear: 'Shoes',
};

const SLOT_HINTS: Record<SwipeSlot, string> = {
  'full-body': 'Dresses, jumpsuits, and one-piece looks',
  headwear: 'Hats, caps, and headpieces',
  top: 'Tops and outer layers',
  bottom: 'Trousers, skirts, and bottoms',
  footwear: 'Shoes and boots',
};

function getEmptySwipeBuckets(): Record<SwipeSlot, ClosetItem[]> {
  return {
    'full-body': [],
    headwear: [],
    top: [],
    bottom: [],
    footwear: [],
  };
}

function buildSwipeBuckets(items: ClosetItem[]): Record<SwipeSlot, ClosetItem[]> {
  const buckets = getEmptySwipeBuckets();
  for (const item of items) {
    const slot = classifyGarmentSlot(item.category, item.garment_type);
    if (slot === 'full-body') {
      buckets['full-body'].push(item);
      continue;
    }
    if (slot in buckets) {
      buckets[slot as Exclude<SwipeSlot, 'full-body'>].push(item);
    }
  }
  return buckets;
}

function getVerticalPosition(index: number, total: number): { x: number; y: number } {
  const spacing = CANVAS_ITEM_DEFAULT + 8;
  const centerX = (Dimensions.get('window').width - 32 - CANVAS_ITEM_DEFAULT) / 2;
  const totalHeight = total * spacing;
  const startY = Math.max(10, (380 - totalHeight) / 2);
  return { x: centerX, y: startY + index * spacing };
}

function pickRandomBySlot(items: ClosetItem[]): ClosetItem[] {
  const buckets: Record<string, ClosetItem[]> = {};
  for (const item of items) {
    const slot = classifyGarmentSlot(item.category, item.garment_type);
    if (!buckets[slot]) buckets[slot] = [];
    buckets[slot].push(item);
  }

  if (__DEV__) {
    console.log(
      '[Stylist] Randomize slot buckets',
      Object.fromEntries(Object.entries(buckets).map(([slot, bucket]) => [slot, bucket.length])),
    );
  }

  const picked: ClosetItem[] = [];
  for (const slot of SLOT_ORDER) {
    const bucket = buckets[slot];
    if (bucket && bucket.length > 0) {
      picked.push(bucket[Math.floor(Math.random() * bucket.length)]);
    }
  }

  // If a full-body item exists and we found no top+bottom, use it instead
  if (picked.length === 0 && buckets['full-body']?.length) {
    picked.push(buckets['full-body'][Math.floor(Math.random() * buckets['full-body'].length)]);
  }

  // Fallback: pick one item per unique category to avoid duplicates like 3 tops
  if (picked.length === 0) {
    const usedCategories = new Set<string>();
    const all = Object.values(buckets).flat().sort(() => Math.random() - 0.5);
    for (const item of all) {
      if (!usedCategories.has(item.category) && picked.length < 4) {
        picked.push(item);
        usedCategories.add(item.category);
      }
    }
  }

  return picked;
}

function buildVerticalEntries(items: ClosetItem[]): CanvasItemEntry[] {
  return items.map((item, i) => ({
    id: `canvas_${item.id}_${Date.now()}_${i}`,
    item,
    defaultX: getVerticalPosition(i, items.length).x,
    defaultY: getVerticalPosition(i, items.length).y,
  }));
}

interface CanvasItemEntry {
  id: string;
  item: ClosetItem;
  defaultX: number;
  defaultY: number;
}

function getFingerDistance(touches: { pageX: number; pageY: number }[]) {
  const [a, b] = [touches[0], touches[1]];
  return Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);
}

function DraggableCanvasItem({
  entry,
  onTap,
  onRemove,
}: {
  entry: CanvasItemEntry;
  onTap: (item: ClosetItem) => void;
  onRemove: (id: string) => void;
}) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const pan = useRef(new Animated.ValueXY({ x: entry.defaultX, y: entry.defaultY })).current;
  const lastOffset = useRef({ x: entry.defaultX, y: entry.defaultY });
  const isDragging = useRef(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [size, setSize] = useState(CANVAS_ITEM_DEFAULT);
  const sizeRef = useRef(CANVAS_ITEM_DEFAULT);
  const isPinching = useRef(false);
  const pinchBaseDistance = useRef(0);
  const pinchBaseSize = useRef(CANVAS_ITEM_DEFAULT);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > 5 || Math.abs(gs.dy) > 5,
      onPanResponderGrant: () => {
        isDragging.current = false;
        longPressTimer.current = setTimeout(() => {
          if (!isDragging.current && !isPinching.current) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            onRemove(entry.id);
          }
        }, 600);
      },
      onPanResponderMove: (_, gs) => {
        if (isPinching.current) return;
        if (Math.abs(gs.dx) > 5 || Math.abs(gs.dy) > 5) {
          isDragging.current = true;
          if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
          }
        }
        pan.setValue({
          x: lastOffset.current.x + gs.dx,
          y: lastOffset.current.y + gs.dy,
        });
      },
      onPanResponderRelease: (_, gs) => {
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }
        if (isPinching.current) {
          isPinching.current = false;
          return;
        }
        lastOffset.current = {
          x: lastOffset.current.x + gs.dx,
          y: lastOffset.current.y + gs.dy,
        };
        if (!isDragging.current) {
          onTap(entry.item);
        }
      },
    })
  ).current;

  const handleTouchStart = useCallback((e: GestureResponderEvent) => {
    if (e.nativeEvent.touches.length === 2) {
      isPinching.current = true;
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
      pinchBaseDistance.current = getFingerDistance(e.nativeEvent.touches);
      pinchBaseSize.current = sizeRef.current;
    }
  }, []);

  const handleTouchMove = useCallback((e: GestureResponderEvent) => {
    if (e.nativeEvent.touches.length === 2 && isPinching.current) {
      const dist = getFingerDistance(e.nativeEvent.touches);
      const scale = dist / pinchBaseDistance.current;
      const next = Math.min(CANVAS_ITEM_MAX, Math.max(CANVAS_ITEM_MIN, pinchBaseSize.current * scale));
      sizeRef.current = next;
      setSize(next);
    }
  }, []);

  const handleTouchEnd = useCallback((e: GestureResponderEvent) => {
    if (e.nativeEvent.touches.length < 2) {
      isPinching.current = false;
    }
  }, []);

  return (
    <Animated.View
      style={[
        styles.canvasItemWrapper,
        { width: size, height: size, transform: pan.getTranslateTransform() },
      ]}
      {...panResponder.panHandlers}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <Image
        source={{ uri: entry.item.clean_image_url || entry.item.image_url }}
        style={styles.canvasItemImage}
        contentFit="contain"
      />
    </Animated.View>
  );
}

export default function StylistScreen() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const [mode, setMode] = useState<StylistMode>('canvas');
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [styleFilter, setStyleFilter] = useState<string[]>([]);
  const [colorFilter, setColorFilter] = useState<string[]>([]);
  const [weatherFilter, setWeatherFilter] = useState<string[]>([]);
  const [layoutFilter, setLayoutFilter] = useState<LayoutFilter>('four-piece');
  const [showClosetPicker, setShowClosetPicker] = useState(false);
  const [closetPickerCategory, setClosetPickerCategory] = useState<ClothingCategory | undefined>();
  const [closetPickerTitle, setClosetPickerTitle] = useState('Add from Closet');
  const [chatMessage, setChatMessage] = useState('');
  const [savedThisOutfit, setSavedThisOutfit] = useState(false);
  const [selectedAccessories, setSelectedAccessories] = useState<ClosetItem[]>([]);
  const [showFitsPicker, setShowFitsPicker] = useState(false);
  const [canvasItems, setCanvasItems] = useState<CanvasItemEntry[]>([]);
  const [swipeIndices, setSwipeIndices] = useState<Record<SwipeSlot, number>>({
    'full-body': 0,
    headwear: 0,
    top: 0,
    bottom: 0,
    footwear: 0,
  });
  const [localWeatherLoaded, setLocalWeatherLoaded] = useState(false);

  const items = useClosetStore((s) => s.items);
  const outfits = useClosetStore((s) => s.outfits);
  const addOutfit = useClosetStore((s) => s.addOutfit);
  const digitalTwin = useClosetStore((s) => s.digitalTwin);
  const setTwinGenerating = useClosetStore((s) => s.setTwinGenerating);
  const setTwinProgress = useClosetStore((s) => s.setTwinProgress);
  const setDigitalTwin = useClosetStore((s) => s.setDigitalTwin);
  const addGeneratedLook = useClosetStore((s) => s.addGeneratedLook);
  const canvasItem = useClosetStore((s) => s.canvasItem);
  const clearCanvasItem = useClosetStore((s) => s.clearCanvasItem);
  const canvasOutfit = useClosetStore((s) => s.canvasOutfit);
  const clearCanvasOutfit = useClosetStore((s) => s.clearCanvasOutfit);

  const addItemToCanvas = useCallback((item: ClosetItem) => {
    setCanvasItems((prev) => {
      if (prev.some((c) => c.item.id === item.id)) return prev;
      const nextIdx = prev.length;
      const pos = getVerticalPosition(nextIdx, nextIdx + 1);
      return [...prev, {
        id: `canvas_${item.id}_${Date.now()}`,
        item,
        defaultX: pos.x,
        defaultY: pos.y,
      }];
    });
    setSavedThisOutfit(false);
  }, []);

  useEffect(() => {
    async function fetchLocalWeatherForStylist() {
      if (localWeatherLoaded) return;
      try {
        const ipRes = await fetch('https://get.geojs.io/v1/ip/geo.json');
        const ipData = await ipRes.json();
        const city = ipData.city || 'New York';
        const weatherRes = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${process.env.EXPO_PUBLIC_OPENWEATHERMAP_KEY}&units=imperial`);
        const weatherData = await weatherRes.json();
        const temp = Math.round(weatherData.main.temp);

        if (temp < 60) {
          setWeatherFilter(['cold']);
        } else if (temp > 75) {
          setWeatherFilter(['hot']);
        } else {
          setWeatherFilter(['warm']);
        }
        setLocalWeatherLoaded(true);
      } catch (err) {
        // fail silently for canvas
        setLocalWeatherLoaded(true);
      }
    }
    fetchLocalWeatherForStylist();
  }, [localWeatherLoaded]);

  const removeCanvasItem = useCallback((canvasId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCanvasItems((prev) => prev.filter((c) => c.id !== canvasId));
    setSavedThisOutfit(false);
  }, []);

  const handleCanvasItemTap = useCallback((item: ClosetItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/item/${item.id}` as Href);
  }, []);

  useEffect(() => {
    if (canvasItem) {
      addItemToCanvas(canvasItem.item);
      clearCanvasItem();
    }
  }, [canvasItem, addItemToCanvas, clearCanvasItem]);

  useEffect(() => {
    if (canvasOutfit) {
      const resolvedItems = canvasOutfit.item_ids
        .map((oid) => items.find((i) => i.id === oid))
        .filter(Boolean) as ClosetItem[];
      setCanvasItems(buildVerticalEntries(resolvedItems));
      clearCanvasOutfit();
    }
  }, [canvasOutfit, items, clearCanvasOutfit]);

  const canvasOutfitItems = useMemo(
    () => canvasItems.map((c) => c.item),
    [canvasItems],
  );

  const filterItems = useCallback((allItems: ClosetItem[]): ClosetItem[] => {
    let filtered = allItems;
    const hasFilters = styleFilter.length > 0 || colorFilter.length > 0 || weatherFilter.length > 0;
    if (!hasFilters) return filtered;

    if (colorFilter.length > 0) {
      filtered = filtered.filter((item) => {
        const itemColors = (item.colors || []).map(c => c.toLowerCase());
        return colorFilter.some((f) => {
          if (f === 'light') return itemColors.some(c => /white|cream|beige|ivory|pastel|light/.test(c));
          if (f === 'dark') return itemColors.some(c => /black|navy|dark|charcoal/.test(c));
          if (f === 'bright') return itemColors.some(c => /red|orange|yellow|pink|neon|bright|vivid/.test(c));
          if (f === 'monochrome') return itemColors.every(c => /black|white|grey|gray/.test(c));
          return true;
        });
      });
    }

    if (weatherFilter.length > 0) {
      filtered = filtered.filter((item) => {
        return weatherFilter.some((w) => {
          if (w === 'cold') return ['outerwear', 'top'].includes(item.category);
          if (w === 'hot') return item.category !== 'outerwear';
          if (w === 'warm') return item.category !== 'outerwear' || item.layer_type === 'inner';
          return true;
        });
      });
    }

    if (styleFilter.length > 0) {
      filtered = filtered.filter((item) => {
        const itemTags = (item.tags || []).map(t => t.toLowerCase());
        return styleFilter.some((s) => itemTags.includes(s) || item.garment_type?.toLowerCase().includes(s));
      });
    }

    return filtered.length > 0 ? filtered : allItems;
  }, [styleFilter, colorFilter, weatherFilter]);

  const filteredItems = useMemo(
    () => filterItems(items),
    [filterItems, items],
  );

  const swipeBuckets = useMemo(
    () => buildSwipeBuckets(filteredItems),
    [filteredItems],
  );

  const activeSwipeSlots = useMemo(
    () => SWIPE_LAYOUT_SLOTS[layoutFilter],
    [layoutFilter],
  );

  const activeSwipeItems = useMemo(
    () => activeSwipeSlots
      .map((slot) => {
        const bucket = swipeBuckets[slot];
        if (!bucket.length) return null;
        return bucket[Math.min(swipeIndices[slot] || 0, bucket.length - 1)];
      })
      .filter(Boolean) as ClosetItem[],
    [activeSwipeSlots, swipeBuckets, swipeIndices],
  );

  const activeOutfitItems = useMemo(
    () => (mode === 'canvas' ? canvasOutfitItems : activeSwipeItems),
    [activeSwipeItems, canvasOutfitItems, mode],
  );

  const activeFilterValue = useMemo<FilterState>(() => ({
    style: styleFilter,
    color: colorFilter,
    weather: weatherFilter,
    layout: layoutFilter,
  }), [colorFilter, layoutFilter, styleFilter, weatherFilter]);

  useEffect(() => {
    setSwipeIndices((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const slot of SWIPE_SLOT_ORDER) {
        const bucket = swipeBuckets[slot];
        const safeIndex = bucket.length === 0 ? 0 : Math.min(prev[slot] || 0, bucket.length - 1);
        if (safeIndex !== prev[slot]) {
          changed = true;
          next[slot] = safeIndex;
        }
      }
      return changed ? next : prev;
    });
  }, [swipeBuckets]);

  useEffect(() => {
    if (mode === 'canvas') return;
    setShowAddMenu(false);
    setShowClosetPicker(false);
    setShowFitsPicker(false);
  }, [mode]);

  const cycleSwipeSlot = useCallback((slot: SwipeSlot, direction: -1 | 1) => {
    setSwipeIndices((prev) => {
      const bucket = swipeBuckets[slot];
      if (bucket.length <= 1) return prev;
      const nextIndex = (prev[slot] + direction + bucket.length) % bucket.length;
      return { ...prev, [slot]: nextIndex };
    });
    setSavedThisOutfit(false);
  }, [swipeBuckets]);

  const handleRandomize = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setSavedThisOutfit(false);

    if (items.length === 0) {
      Alert.alert('No items', 'Add items to your closet first to build outfits.');
      return;
    }

    const hasFilters = styleFilter.length > 0 || colorFilter.length > 0 || weatherFilter.length > 0;

    if (mode === 'swipe') {
      let foundAny = false;
      setSwipeIndices((prev) => {
        const next = { ...prev };
        for (const slot of activeSwipeSlots) {
          const bucket = swipeBuckets[slot];
          if (!bucket.length) continue;
          next[slot] = Math.floor(Math.random() * bucket.length);
          foundAny = true;
        }
        return next;
      });

      if (!foundAny) {
        Alert.alert('No matching pieces', 'Try a different layout or relax your filters to see more options.');
      }
      return;
    }

    if (hasFilters && filteredItems.length >= 2) {
      try {
        const smartItems = filteredItems.map(i => ({
          id: i.id, name: i.name, category: i.category,
          colors: i.colors || [], tags: i.tags || [],
        }));
        const pickedIds = await Promise.race([
          generateSmartOutfit(smartItems, { style: styleFilter, color: colorFilter, weather: weatherFilter }),
          new Promise<string[]>((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000)),
        ]);
        if (pickedIds.length > 0) {
          const pickedItems = pickedIds
            .map(id => filteredItems.find(i => i.id === id))
            .filter(Boolean) as ClosetItem[];
          if (pickedItems.length > 0) {
            setCanvasItems(buildVerticalEntries(pickedItems));
            return;
          }
        }
      } catch {
        // fallback to random
      }
    }

    const picked = pickRandomBySlot(filteredItems);
    setCanvasItems(buildVerticalEntries(picked));
  }, [activeSwipeSlots, colorFilter, filteredItems, items, mode, styleFilter, swipeBuckets, weatherFilter]);

  const handleSave = useCallback(() => {
    if (activeOutfitItems.length === 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert('No outfit', mode === 'canvas' ? 'Add items to the canvas first.' : 'Choose at least one swipe-mode piece first.');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSavedThisOutfit(true);

    const outfit: Outfit = {
      id: `outfit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      user_id: 'demo',
      items: activeOutfitItems,
      item_ids: activeOutfitItems.map((i) => i.id),
      name: `${mode === 'swipe' ? 'Swipe' : 'Canvas'} Outfit ${new Date().toLocaleDateString()}`,
      seasons: [],
      pinned: false,
      created_at: new Date().toISOString(),
    };

    addOutfit(outfit);
  }, [activeOutfitItems, addOutfit, mode]);

  const handleAddMenuItem = useCallback((action: string) => {
    setShowAddMenu(false);
    if (action === 'pieces') {
      setClosetPickerCategory(undefined);
      setClosetPickerTitle('Add Piece');
      setShowClosetPicker(true);
    } else if (action === 'accessories') {
      setClosetPickerCategory('accessory' as ClothingCategory);
      setClosetPickerTitle('Select Accessories');
      setShowClosetPicker(true);
    } else if (action === 'fits') {
      if (outfits.length === 0) {
        Alert.alert('No saved fits', 'Save outfits from the canvas first to load them here.');
        return;
      }
      setShowFitsPicker(true);
    }
  }, [outfits]);

  const handleLoadFit = useCallback((outfit: Outfit) => {
    setShowFitsPicker(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSavedThisOutfit(false);

    const resolvedItems = outfit.item_ids
      .map((oid) => items.find((i) => i.id === oid))
      .filter(Boolean) as ClosetItem[];
    setCanvasItems(buildVerticalEntries(resolvedItems));
  }, [items]);

  const handleClosetSelect = useCallback((selected: ClosetItem[]) => {
    setShowClosetPicker(false);
    if (selected.length === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSavedThisOutfit(false);

    if (closetPickerCategory === ('accessory' as ClothingCategory)) {
      setSelectedAccessories(selected);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return;
    }

    for (const item of selected) {
      addItemToCanvas(item);
    }
  }, [closetPickerCategory, addItemToCanvas]);

  const handleSend = useCallback(async () => {
    if (!chatMessage.trim() && activeOutfitItems.length === 0) return;
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

    const allItems = [...activeOutfitItems, ...selectedAccessories];
    const outfitItemsForAI: OutfitTwinItem[] = allItems.map(item => ({
      name: item.name,
      category: item.category,
      imageUri: item.clean_image_url || item.image_url,
    }));

    const scenePrompt = chatMessage.trim() || undefined;
    setChatMessage('');

    setTwinGenerating(true);
    setTwinProgress('Dressing your twin in this fit...');

    try {
      const newTwinImageUrl = await generateOutfitTwin(
        digitalTwin.twin_image_url,
        outfitItemsForAI,
        scenePrompt,
        digitalTwin.selfie_url,
      );

      setDigitalTwin({
        ...digitalTwin,
        twin_image_url: newTwinImageUrl,
        updated_at: new Date().toISOString(),
      });

      const look: GeneratedLook = {
        id: `look_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        image_url: newTwinImageUrl,
        outfit_item_ids: allItems.map(i => i.id),
        prompt: scenePrompt,
        created_at: new Date().toISOString(),
      };
      addGeneratedLook(look);

      setTwinProgress('New fit generated!');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => {
        setTwinGenerating(false);
        router.push('/digital-twin-preview' as Href);
      }, 500);
    } catch (e: unknown) {
      setTwinGenerating(false);
      setTwinProgress(null);
      Alert.alert('Generation failed', e instanceof Error ? e.message : 'Something went wrong');
    }
  }, [activeOutfitItems, chatMessage, selectedAccessories, digitalTwin, setTwinGenerating, setTwinProgress, setDigitalTwin, addGeneratedLook]);

  const handleOpenStyleChat = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/style-chat' as Href);
  };

  const twinGenerating = useClosetStore((s) => s.twinGenerating);
  const twinProgress = useClosetStore((s) => s.twinProgress);

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

        <View style={styles.topCenter}>
          <Pressable style={styles.titlePill} onPress={handleOpenStyleChat}>
            <Sparkles size={14} color={Colors.accentGreen} />
            <Text style={styles.titleText}>StyleAI</Text>
          </Pressable>
          <View style={styles.modeToggle}>
            <Pressable
              style={[styles.modePill, mode === 'canvas' && styles.modePillActive]}
              onPress={() => {
                Haptics.selectionAsync();
                setMode('canvas');
              }}
            >
              <Text style={[styles.modeText, mode === 'canvas' && styles.modeTextActive]}>Canvas</Text>
            </Pressable>
            <Pressable
              style={[styles.modePill, mode === 'swipe' && styles.modePillActive]}
              onPress={() => {
                Haptics.selectionAsync();
                setMode('swipe');
              }}
            >
              <Text style={[styles.modeText, mode === 'swipe' && styles.modeTextActive]}>Swipe</Text>
            </Pressable>
          </View>
        </View>

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

      <View style={styles.canvasArea}>
        <View style={styles.canvas}>
          {mode === 'canvas' ? (
            canvasItems.length > 0 ? (
              canvasItems.map((entry) => (
                <DraggableCanvasItem
                  key={entry.id}
                  entry={entry}
                  onTap={handleCanvasItemTap}
                  onRemove={removeCanvasItem}
                />
              ))
            ) : (
              <View style={styles.canvasPlaceholder}>
                <Sparkles size={32} color={Colors.textTertiary} strokeWidth={1.2} />
                <Text style={styles.canvasTitle}>Your Outfit Board</Text>
                <Text style={styles.canvasSubtitle}>
                  Tap + to add items, drag to arrange{'\n'}Pinch to resize, long-press to remove
                </Text>
              </View>
            )
          ) : (
            <View style={styles.swipeContainer}>
              <View style={styles.swipeHeader}>
                <Text style={styles.swipeTitle}>Swipe Mode</Text>
                <Text style={styles.swipeSubtitle}>{LAYOUT_LABELS[layoutFilter]}</Text>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.swipeSlots}
              >
                {activeSwipeSlots.map((slot) => {
                  const bucket = swipeBuckets[slot];
                  const activeIndex = bucket.length ? Math.min(swipeIndices[slot] || 0, bucket.length - 1) : 0;
                  const activeItem = bucket[activeIndex];
                  const canCycle = bucket.length > 1;

                  return (
                    <View key={slot} style={styles.swipeSlotCard}>
                      <View style={styles.swipeSlotHeader}>
                        <View>
                          <Text style={styles.swipeSlotLabel}>{SLOT_LABELS[slot]}</Text>
                          <Text style={styles.swipeSlotHint}>{SLOT_HINTS[slot]}</Text>
                        </View>
                        <Text style={styles.swipeSlotCount}>
                          {bucket.length === 0 ? 'No matches' : `${activeIndex + 1}/${bucket.length}`}
                        </Text>
                      </View>

                      {activeItem ? (
                        <View style={styles.swipeSlotBody}>
                          <Pressable
                            style={[styles.swipeArrow, !canCycle && styles.swipeArrowDisabled]}
                            disabled={!canCycle}
                            onPress={() => cycleSwipeSlot(slot, -1)}
                          >
                            <ChevronLeft size={18} color={canCycle ? Colors.textPrimary : Colors.textTertiary} />
                          </Pressable>

                          <Pressable
                            style={styles.swipeItemCard}
                            onPress={() => handleCanvasItemTap(activeItem)}
                          >
                            <Image
                              source={{ uri: activeItem.clean_image_url || activeItem.image_url }}
                              style={styles.swipeItemImage}
                              contentFit="contain"
                            />
                            <Text style={styles.swipeItemName} numberOfLines={1}>{activeItem.name}</Text>
                            <Text style={styles.swipeItemMeta} numberOfLines={1}>
                              {activeItem.garment_type || activeItem.category}
                            </Text>
                          </Pressable>

                          <Pressable
                            style={[styles.swipeArrow, !canCycle && styles.swipeArrowDisabled]}
                            disabled={!canCycle}
                            onPress={() => cycleSwipeSlot(slot, 1)}
                          >
                            <ChevronRight size={18} color={canCycle ? Colors.textPrimary : Colors.textTertiary} />
                          </Pressable>
                        </View>
                      ) : (
                        <View style={styles.swipeEmptyState}>
                          <Text style={styles.swipeEmptyTitle}>No {SLOT_LABELS[slot].toLowerCase()} available</Text>
                          <Text style={styles.swipeEmptyText}>
                            Try a different layout or relax your filters to include more closet pieces.
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {accessoryCount > 0 && (
            <View style={styles.accessoryBadge}>
              <Text style={styles.accessoryBadgeText}>+{accessoryCount} accessories</Text>
            </View>
          )}
        </View>
      </View>

      {/* FABs on right side */}
      <View style={styles.fabColumn}>
        {mode === 'canvas' && (
          <Pressable
            style={styles.fabPlus}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setShowAddMenu(true);
            }}
          >
            <Plus size={22} color="#fff" />
          </Pressable>
        )}
        <Pressable
          style={styles.fab}
          onPress={handleRandomize}
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
          {mode === 'canvas' ? (
            <Pressable style={styles.chatPlusBtn} onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setShowAddMenu(true);
            }}>
              <Plus size={18} color={Colors.textSecondary} />
            </Pressable>
          ) : (
            <View style={styles.chatModeBadge}>
              <Text style={styles.chatModeBadgeText}>{LAYOUT_LABELS[layoutFilter]}</Text>
            </View>
          )}
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
        value={activeFilterValue}
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
                <View style={styles.fitsPickerStack}>
                  {outfit.items.slice(0, 4).map((piece, idx) => (
                    <View key={piece.id} style={[styles.fitsPickerStackItem, { zIndex: 10 - idx }]}>
                      <Image source={{ uri: piece.clean_image_url || piece.image_url }} style={styles.fitsPickerStackImage} contentFit="contain" />
                    </View>
                  ))}
                </View>
                <View style={styles.fitsPickerInfo}>
                  <Text style={styles.fitsPickerName}>{outfit.name}</Text>
                  <Text style={styles.fitsPickerSub}>{outfit.items.length} pieces</Text>
                </View>
              </Pressable>
            )}
          />
        </SafeAreaView>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const createStyles = (Colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 8 },
  topBarBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: Colors.cardSurfaceAlt, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  topCenter: { alignItems: 'center', gap: 8 },
  titlePill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.textPrimary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: Radius.pill },
  titleText: { fontFamily: Typography.bodyFamilyBold, fontSize: 14, color: Colors.background },
  modeToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.cardSurfaceAlt, padding: 4, borderRadius: Radius.pill, borderWidth: 1, borderColor: Colors.border },
  modePill: { borderRadius: Radius.pill, paddingHorizontal: 14, paddingVertical: 7 },
  modePillActive: { backgroundColor: Colors.textPrimary },
  modeText: { fontFamily: Typography.bodyFamilyMedium, fontSize: 12, color: Colors.textSecondary },
  modeTextActive: { color: Colors.background, fontFamily: Typography.bodyFamilyBold },
  avatarCircle: { width: 42, height: 42, borderRadius: 21, backgroundColor: Colors.cardSurfaceAlt, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  avatarText: { fontFamily: Typography.bodyFamilyBold, fontSize: 14, color: Colors.textSecondary },
  twinBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginTop: 4, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: Colors.cardSurfaceAlt, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border },
  twinBannerText: { fontFamily: Typography.bodyFamilyMedium, fontSize: 13, color: Colors.textSecondary },
  canvasArea: { flex: 1, marginHorizontal: 16, marginTop: 8, marginBottom: 8 },
  canvas: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: Radius.lg, overflow: 'hidden' },
  canvasPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  canvasTitle: { fontFamily: Typography.serifFamilyBold, fontSize: 18, color: Colors.textTertiary },
  canvasSubtitle: { fontFamily: Typography.bodyFamily, fontSize: 13, color: Colors.textTertiary, textAlign: 'center' },
  canvasItemWrapper: { position: 'absolute' },
  canvasItemImage: { width: '100%', height: '100%' },
  swipeContainer: { flex: 1, padding: 16, backgroundColor: Colors.background },
  swipeHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  swipeTitle: { fontFamily: Typography.serifFamilyBold, fontSize: 20, color: Colors.textPrimary },
  swipeSubtitle: { fontFamily: Typography.bodyFamilyBold, fontSize: 12, color: Colors.accentGreen },
  swipeSlots: { gap: 12, paddingBottom: 12 },
  swipeSlotCard: { borderRadius: Radius.lg, backgroundColor: Colors.cardSurface, borderWidth: 1, borderColor: Colors.border, padding: 14, gap: 12 },
  swipeSlotHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  swipeSlotLabel: { fontFamily: Typography.bodyFamilyBold, fontSize: 14, color: Colors.textPrimary },
  swipeSlotHint: { fontFamily: Typography.bodyFamily, fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  swipeSlotCount: { fontFamily: Typography.bodyFamilyMedium, fontSize: 12, color: Colors.textSecondary },
  swipeSlotBody: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  swipeArrow: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.cardSurfaceAlt, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  swipeArrowDisabled: { opacity: 0.45 },
  swipeItemCard: { flex: 1, minHeight: 118, borderRadius: Radius.md, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', padding: 12 },
  swipeItemImage: { width: '100%', height: 70 },
  swipeItemName: { fontFamily: Typography.bodyFamilyBold, fontSize: 13, color: '#111827', marginTop: 8 },
  swipeItemMeta: { fontFamily: Typography.bodyFamily, fontSize: 12, color: '#6B7280', marginTop: 2, textTransform: 'capitalize' },
  swipeEmptyState: { borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, borderStyle: 'dashed', paddingHorizontal: 14, paddingVertical: 18, backgroundColor: Colors.cardSurfaceAlt },
  swipeEmptyTitle: { fontFamily: Typography.bodyFamilyBold, fontSize: 13, color: Colors.textPrimary },
  swipeEmptyText: { fontFamily: Typography.bodyFamily, fontSize: 12, color: Colors.textSecondary, marginTop: 4 },
  accessoryBadge: { position: 'absolute', bottom: 8, left: 8, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  accessoryBadgeText: { fontFamily: Typography.bodyFamilyMedium, fontSize: 11, color: '#FFF' },
  fabColumn: { position: 'absolute', right: 28, bottom: 220, gap: 12 },
  fabPlus: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#32D583', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 },
  fab: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.cardSurfaceAlt, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 },
  fabSaved: { borderColor: Colors.accentGreen },
  chatBarWrapper: { paddingHorizontal: 16, paddingBottom: 80, paddingTop: 4 },
  chatBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.cardSurfaceAlt, borderRadius: Radius.pill, paddingHorizontal: 6, paddingVertical: 6, gap: 8, borderWidth: 1, borderColor: Colors.border },
  chatPlusBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.cardSurface, alignItems: 'center', justifyContent: 'center' },
  chatModeBadge: { minWidth: 90, height: 36, borderRadius: 18, backgroundColor: Colors.cardSurface, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  chatModeBadgeText: { fontFamily: Typography.bodyFamilyBold, fontSize: 11, color: Colors.textSecondary },
  chatInput: { flex: 1, fontFamily: Typography.bodyFamily, fontSize: 13, color: Colors.textPrimary, paddingVertical: 0 },
  sendBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.accentGreen, alignItems: 'center', justifyContent: 'center' },
  fitsPickerContainer: { flex: 1, backgroundColor: Colors.background },
  fitsPickerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  fitsPickerClose: { paddingHorizontal: 8, paddingVertical: 4 },
  fitsPickerCloseText: { fontFamily: Typography.bodyFamilyMedium, fontSize: 15, color: Colors.textSecondary },
  fitsPickerTitle: { fontFamily: Typography.bodyFamilyBold, fontSize: 16, color: Colors.textPrimary },
  fitsPickerCard: { flexDirection: 'row', marginBottom: 16, padding: 16, backgroundColor: Colors.cardSurface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, gap: 14 },
  fitsPickerStack: { width: 80, alignItems: 'center' },
  fitsPickerStackItem: { width: 70, height: 70, marginBottom: -30, backgroundColor: Colors.cardSurfaceAlt },
  fitsPickerStackImage: { width: '100%', height: '100%' },
  fitsPickerInfo: { flex: 1, justifyContent: 'center' },
  fitsPickerName: { fontFamily: Typography.bodyFamilyBold, fontSize: 15, color: Colors.textPrimary },
  fitsPickerSub: { fontFamily: Typography.bodyFamily, fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
});
