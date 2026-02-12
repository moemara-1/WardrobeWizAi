import { AddMenuPopover } from '@/components/ui/AddMenuPopover';
import { OutfitFilters } from '@/components/ui/OutfitFilters';
import { Colors, Radius, Typography } from '@/constants/Colors';
import { useOutfitGenerator } from '@/hooks/useOutfitGenerator';
import { useClosetStore } from '@/stores/closetStore';
import { Outfit } from '@/types';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import {
    Bookmark,
    BookmarkCheck,
    Dices,
    Plus,
    Send,
    SlidersHorizontal,
    Sparkles
} from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import {
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function StylistScreen() {
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [savedThisOutfit, setSavedThisOutfit] = useState(false);

  const items = useClosetStore((s) => s.items);
  const addOutfit = useClosetStore((s) => s.addOutfit);
  const { generateOutfit, isGenerating, suggestions } = useOutfitGenerator();

  // Current outfit items on the canvas from the latest suggestion
  const currentOutfitItems = suggestions.length > 0 ? suggestions[0].items : [];

  const handleSave = useCallback(() => {
    if (currentOutfitItems.length === 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert('No outfit', 'Use the dice button to generate an outfit first, then save it.');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSavedThisOutfit(true);

    const outfit: Outfit = {
      id: `outfit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      user_id: 'demo',
      items: currentOutfitItems,
      item_ids: currentOutfitItems.map((i) => i.id),
      name: suggestions[0]?.occasion
        ? `${suggestions[0].occasion.charAt(0).toUpperCase() + suggestions[0].occasion.slice(1)} Outfit`
        : `Outfit ${new Date().toLocaleDateString()}`,
      occasion: suggestions[0]?.occasion,
      seasons: [],
      ai_notes: suggestions[0]?.reasoning,
      pinned: false,
      created_at: new Date().toISOString(),
    };

    addOutfit(outfit);
  }, [currentOutfitItems, suggestions, addOutfit]);

  const handleRandomize = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setSavedThisOutfit(false);

    if (items.length < 2) {
      Alert.alert('Not enough items', 'Add at least 2 items to your closet to generate outfits.');
      return;
    }

    // Pick a random base item to build around
    const baseItem = items[Math.floor(Math.random() * items.length)];
    await generateOutfit({
      base_items: [baseItem.id],
      occasion: 'casual',
    });
  }, [items, generateOutfit]);

  const handleSend = () => {
    if (!chatMessage.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Open style chat with the message pre-filled
    router.push('/style-chat' as never);
    setChatMessage('');
  };

  const pickAndAnalyze = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      router.push({ pathname: '/analyze', params: { imageUri: result.assets[0].uri } } as never);
    }
  }, []);

  const handleAddMenuItem = (action: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowAddMenu(false);
    pickAndAnalyze();
  };

  const handleOpenStyleChat = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/style-chat' as never);
  };

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

      <View style={styles.canvas}>
        {currentOutfitItems.length > 0 ? (
          <View style={styles.canvasGrid}>
            {currentOutfitItems.map((item) => (
              <Pressable
                key={item.id}
                style={styles.canvasItem}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push(`/item/${item.id}` as never);
                }}
              >
                <Image
                  source={{ uri: item.clean_image_url || item.image_url }}
                  style={styles.canvasItemImage}
                  resizeMode="contain"
                />
                <Text style={styles.canvasItemName} numberOfLines={1}>{item.name}</Text>
              </Pressable>
            ))}
            {suggestions[0]?.reasoning && (
              <View style={styles.reasoningBanner}>
                <Sparkles size={14} color={Colors.accentGreen} />
                <Text style={styles.reasoningText} numberOfLines={2}>
                  {suggestions[0].reasoning}
                </Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.canvasPlaceholder}>
            <Sparkles size={32} color={Colors.textTertiary} strokeWidth={1.2} />
            <Text style={styles.canvasTitle}>Your Outfit Canvas</Text>
            <Text style={styles.canvasSubtitle}>
              Use the + button to add pieces{'\n'}or tap the dice to generate an outfit
            </Text>
          </View>
        )}
      </View>

      <View style={styles.fabColumn}>
        <Pressable style={[styles.fab, isGenerating && { opacity: 0.5 }]} onPress={handleRandomize} disabled={isGenerating}>
          <Dices size={20} color={Colors.textPrimary} />
        </Pressable>
        <Pressable style={[styles.fab, savedThisOutfit && styles.fabSaved]} onPress={handleSave}>
          {savedThisOutfit
            ? <BookmarkCheck size={20} color={Colors.accentGreen} />
            : <Bookmark size={20} color={Colors.textPrimary} />
          }
        </Pressable>
        <Pressable
          style={styles.fabPlus}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setShowAddMenu(true);
          }}
        >
          <Plus size={22} color={Colors.background} />
        </Pressable>
      </View>

      {showAddMenu && (
        <AddMenuPopover
          onClose={() => setShowAddMenu(false)}
          onSelect={handleAddMenuItem}
        />
      )}

      <View style={styles.chatBarWrapper}>
        <View style={styles.chatBar}>
          <Pressable
            style={styles.chatPlusBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setShowAddMenu(true);
            }}
          >
            <Plus size={18} color={Colors.textSecondary} />
          </Pressable>
          <TextInput
            style={styles.chatInput}
            placeholder="Ask Stylist AI..."
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 8 },
  topBarBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.cardSurfaceAlt, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  titlePill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.cardSurfaceAlt, paddingHorizontal: 16, paddingVertical: 8, borderRadius: Radius.pill, borderWidth: 1, borderColor: Colors.border },
  titleText: { fontFamily: Typography.bodyFamilyBold, fontSize: 14, color: Colors.textPrimary },
  avatarCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.accentGreen, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: Typography.bodyFamilyBold, fontSize: 14, color: Colors.background },
  canvas: { flex: 1, marginHorizontal: 16, marginTop: 8, marginBottom: 8, backgroundColor: Colors.cardSurface, borderRadius: Radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  canvasPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  canvasTitle: { fontFamily: Typography.serifFamilyBold, fontSize: 18, color: Colors.textTertiary },
  canvasSubtitle: { fontFamily: Typography.bodyFamily, fontSize: 13, color: Colors.textTertiary, textAlign: 'center' },
  canvasGrid: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 10, alignContent: 'flex-start' },
  canvasItem: { width: '46%', alignItems: 'center', gap: 4 },
  canvasItemImage: { width: '100%', aspectRatio: 1, borderRadius: Radius.md, backgroundColor: '#FFFFFF' },
  canvasItemName: { fontFamily: Typography.bodyFamily, fontSize: 11, color: Colors.textSecondary },
  reasoningBanner: { width: '100%', flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: Colors.cardSurfaceAlt, borderRadius: Radius.md, padding: 10, marginTop: 4 },
  reasoningText: { fontFamily: Typography.bodyFamily, fontSize: 12, color: Colors.textSecondary, flex: 1, lineHeight: 17 },
  fabColumn: { position: 'absolute', right: 28, bottom: 148, gap: 12 },
  fab: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.cardSurfaceAlt, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 },
  fabSaved: { borderColor: Colors.accentGreen },
  fabPlus: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#32D583', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 },
  chatBarWrapper: { paddingHorizontal: 16, paddingBottom: 86, paddingTop: 4 },
  chatBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.cardSurfaceAlt, borderRadius: Radius.pill, paddingHorizontal: 6, paddingVertical: 6, gap: 8, borderWidth: 1, borderColor: Colors.border },
  chatPlusBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.cardSurface, alignItems: 'center', justifyContent: 'center' },
  chatInput: { flex: 1, fontFamily: Typography.bodyFamily, fontSize: 14, color: Colors.textPrimary, paddingVertical: 0 },
  sendBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.accentGreen, alignItems: 'center', justifyContent: 'center' },
});
