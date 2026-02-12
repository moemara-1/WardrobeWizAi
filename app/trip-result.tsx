import { Colors, Radius, Typography } from '@/constants/Colors';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Check, List, Pencil } from 'lucide-react-native';
import React, { useRef, useState } from 'react';
import {
    Dimensions,
    FlatList,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface DayOutfit {
  label: string;
  items: { name: string; category: string; imageUrl: string; reused: boolean }[];
}

const MOCK_DAYS: DayOutfit[] = [
  {
    label: 'Airport',
    items: [
      { name: 'Classic Black Bomber', category: 'tops', imageUrl: 'https://images.unsplash.com/photo-1544441893-675973e31985?w=200', reused: true },
      { name: 'Classic White Low-Tops', category: 'footwear', imageUrl: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=200', reused: true },
      { name: 'Neutral Everyday Hoodie', category: 'tops', imageUrl: 'https://images.unsplash.com/photo-1622470953794-aa9c70b0fb9d?w=200', reused: false },
    ],
  },
  {
    label: 'Day 1',
    items: [
      { name: 'Classic Black Bomber', category: 'tops', imageUrl: 'https://images.unsplash.com/photo-1544441893-675973e31985?w=200', reused: true },
      { name: 'Classic White Low-Tops', category: 'footwear', imageUrl: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=200', reused: true },
      { name: 'Oriental Heritage Track Jacket', category: 'tops', imageUrl: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=200', reused: false },
    ],
  },
  {
    label: 'Day 2',
    items: [
      { name: 'Essential White Tee', category: 'tops', imageUrl: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=200', reused: false },
      { name: 'Classic Blue Denim', category: 'bottoms', imageUrl: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=200', reused: false },
      { name: 'AJ1 Retro High', category: 'footwear', imageUrl: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=200', reused: false },
    ],
  },
];

export default function TripResultScreen() {
  const [currentPage, setCurrentPage] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: { index: number | null }[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index != null) {
      setCurrentPage(viewableItems[0].index);
    }
  }).current;

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.headerArea}>
        <Text style={styles.tripMeta}>3 days \u00B7 New York City, NY, USA \u00B7 Fun</Text>
        <Text style={styles.weatherText}>14\u00B0F</Text>
        <Pressable style={styles.listBtn}>
          <List size={18} color={Colors.textPrimary} />
        </Pressable>
      </SafeAreaView>

      <FlatList
        ref={flatListRef}
        data={MOCK_DAYS}
        keyExtractor={(item) => item.label}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
        renderItem={({ item }) => (
          <View style={styles.page}>
            <View style={styles.dayHeader}>
              <Text style={styles.dayLabel}>{item.label}</Text>
              <Pressable style={styles.editBtn}>
                <Pencil size={16} color={Colors.textPrimary} />
              </Pressable>
            </View>
            {item.items.map((outfit: DayOutfit['items'][number], i: number) => (
              <View key={i} style={styles.outfitCard}>
                <Image source={{ uri: outfit.imageUrl }} style={styles.outfitImage} contentFit="contain" />
                <View style={styles.outfitInfo}>
                  <Text style={styles.outfitName}>{outfit.name}</Text>
                  <Text style={styles.outfitCat}>{outfit.category}</Text>
                  {outfit.reused && <Text style={styles.reusedBadge}>Reused</Text>}
                </View>
              </View>
            ))}
          </View>
        )}
      />

      {/* Page Dots */}
      <View style={styles.dotsRow}>
        {MOCK_DAYS.map((_, i) => (
          <View key={i} style={[styles.dot, currentPage === i && styles.dotActive]} />
        ))}
      </View>

      {/* Actions */}
      <SafeAreaView edges={['bottom']} style={styles.actionsRow}>
        <Pressable
          style={styles.editTripBtn}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}
        >
          <Pencil size={16} color={Colors.textPrimary} />
          <Text style={styles.editTripText}>Edit Trip</Text>
        </Pressable>
        <Pressable
          style={styles.saveTripBtn}
          onPress={() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)}
        >
          <Check size={16} color="#FFF" />
          <Text style={styles.saveTripText}>Save Trip</Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerArea: { paddingHorizontal: 16, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  tripMeta: { fontFamily: Typography.bodyFamilyBold, fontSize: 15, color: Colors.textPrimary, flex: 1 },
  weatherText: { fontFamily: Typography.bodyFamily, fontSize: 13, color: Colors.textSecondary, marginRight: 8 },
  listBtn: { width: 36, height: 36, borderRadius: Radius.sm, backgroundColor: Colors.cardSurfaceAlt, alignItems: 'center', justifyContent: 'center' },
  page: { width: SCREEN_WIDTH, paddingHorizontal: 16 },
  dayHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, marginTop: 8 },
  dayLabel: { fontFamily: Typography.bodyFamilyBold, fontSize: 22, color: Colors.textPrimary },
  editBtn: { width: 36, height: 36, borderRadius: Radius.sm, backgroundColor: Colors.cardSurfaceAlt, alignItems: 'center', justifyContent: 'center' },
  outfitCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.cardSurface, borderRadius: Radius.lg, padding: 12, gap: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.border },
  outfitImage: { width: 72, height: 72, borderRadius: Radius.sm, backgroundColor: Colors.cardSurfaceAlt },
  outfitInfo: { flex: 1, gap: 2 },
  outfitName: { fontFamily: Typography.bodyFamilyBold, fontSize: 15, color: Colors.textPrimary },
  outfitCat: { fontFamily: Typography.bodyFamily, fontSize: 12, color: Colors.textSecondary },
  reusedBadge: { fontFamily: Typography.bodyFamilyBold, fontSize: 11, color: '#3B82F6', marginTop: 2 },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingVertical: 16 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.textTertiary },
  dotActive: { backgroundColor: Colors.textPrimary },
  actionsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 12, paddingTop: 8, paddingBottom: 8 },
  editTripBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderRadius: Radius.pill, backgroundColor: Colors.cardSurfaceAlt, borderWidth: 1, borderColor: Colors.border },
  editTripText: { fontFamily: Typography.bodyFamilyBold, fontSize: 15, color: Colors.textPrimary },
  saveTripBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderRadius: Radius.pill, backgroundColor: '#3B82F6' },
  saveTripText: { fontFamily: Typography.bodyFamilyBold, fontSize: 15, color: '#FFF' },
});
