import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, type Href } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Colors, Radius, Typography } from '@/constants/Colors';
import { useClosetStore } from '@/stores/closetStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const THUMB_SIZE = (SCREEN_WIDTH - 64 - 36) / 4;

const CATEGORIES_ORDER = ['hat', 'top', 'outerwear', 'bottom', 'shoe', 'accessory', 'bag'] as const;
const CATEGORY_LABELS: Record<string, string> = {
  hat: 'Headwear', top: 'Top', outerwear: 'Outerwear',
  bottom: 'Bottom', shoe: 'Footwear', accessory: 'Accessories', bag: 'Bags',
};

export default function VirtualTryOnScreen() {
  const { items } = useClosetStore();
  const [selected, setSelected] = useState<Record<string, string>>({});

  const toggleItem = (id: string, category: string) => {
    Haptics.selectionAsync();
    setSelected((prev) => prev[category] === id ? { ...prev, [category]: '' } : { ...prev, [category]: id });
  };

  const handleTryOn = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.push('/virtual-try-on-result' as Href);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable style={styles.cancelBtn} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Select Pieces</Text>
        <Pressable style={styles.tryOnBtn} onPress={handleTryOn}>
          <Text style={styles.tryOnText}>Try On</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {CATEGORIES_ORDER.map((cat) => {
          const catItems = items.filter((i) => i.category === cat);
          return (
            <View key={cat} style={styles.categorySection}>
              <Text style={styles.categoryTitle}>{CATEGORY_LABELS[cat] || cat}</Text>
              {catItems.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyText}>No {(CATEGORY_LABELS[cat] || cat).toLowerCase()} pieces</Text>
                </View>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbRow}>
                  {catItems.map((item) => (
                    <Pressable
                      key={item.id}
                      style={[styles.thumb, selected[cat] === item.id && styles.thumbSelected]}
                      onPress={() => toggleItem(item.id, cat)}
                    >
                      <Image source={{ uri: item.image_url }} style={styles.thumbImage} contentFit="contain" />
                    </Pressable>
                  ))}
                </ScrollView>
              )}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 8 },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 8 },
  cancelText: { fontFamily: Typography.bodyFamilyMedium, fontSize: 15, color: Colors.textSecondary },
  headerTitle: { fontFamily: Typography.bodyFamilyBold, fontSize: 17, color: Colors.textPrimary },
  tryOnBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: Radius.pill, backgroundColor: Colors.accentBlue },
  tryOnText: { fontFamily: Typography.bodyFamilyMedium, fontSize: 14, color: '#FFF' },
  subtitle: { fontFamily: Typography.bodyFamily, fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginBottom: 16 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },
  categorySection: { marginBottom: 20 },
  categoryTitle: { fontFamily: Typography.bodyFamilyBold, fontSize: 16, color: Colors.textPrimary, marginBottom: 8 },
  emptyCard: { backgroundColor: Colors.cardSurface, borderRadius: Radius.md, paddingHorizontal: 16, paddingVertical: 24, borderWidth: 1, borderColor: Colors.border },
  emptyText: { fontFamily: Typography.bodyFamily, fontSize: 13, color: Colors.textTertiary },
  thumbRow: { gap: 12 },
  thumb: { width: THUMB_SIZE, height: THUMB_SIZE, borderRadius: Radius.sm, backgroundColor: Colors.cardSurface, overflow: 'hidden', borderWidth: 2, borderColor: 'transparent' },
  thumbSelected: { borderColor: Colors.accentGreen },
  thumbImage: { width: '100%', height: '100%' },
});
