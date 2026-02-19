import { Radius, Typography } from '@/constants/Colors';
import { useThemeColors } from '@/contexts/ThemeContext';
import { generateTripOutfits, TripDayOutfit } from '@/lib/ai';
import { useClosetStore } from '@/stores/closetStore';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { Check, Pencil, Shirt } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ResolvedDayOutfit {
  label: string;
  items: { id: string; name: string; category: string; imageUrl: string; reused: boolean }[];
}

export default function TripResultScreen() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const { days: daysStr, destinations: destsStr, occasion } = useLocalSearchParams<{
    days: string;
    destinations: string;
    occasion: string;
  }>();

  const days = parseInt(daysStr || '3', 10);
  const destinations: string[] = destsStr ? JSON.parse(destsStr) : ['Unknown'];
  const tripOccasion = occasion || 'fun';

  const closetItems = useClosetStore((s) => s.items);
  const [resolvedDays, setResolvedDays] = useState<ResolvedDayOutfit[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const resolveOutfits = useCallback((aiDays: TripDayOutfit[]): ResolvedDayOutfit[] => {
    const usedIds = new Set<string>();
    return aiDays.map(day => {
      const items = day.itemIds
        .map(id => closetItems.find(i => i.id === id))
        .filter(Boolean)
        .map(item => {
          const reused = usedIds.has(item!.id);
          usedIds.add(item!.id);
          return {
            id: item!.id,
            name: item!.name,
            category: item!.category,
            imageUrl: item!.clean_image_url || item!.image_url,
            reused,
          };
        });
      return { label: day.label, items };
    });
  }, [closetItems]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const smartItems = closetItems.map(i => ({
          id: i.id, name: i.name, category: i.category,
          colors: i.colors, tags: i.tags,
        }));
        const aiResult = await generateTripOutfits(smartItems, days, destinations, tripOccasion);
        if (!cancelled && aiResult.length > 0) {
          setResolvedDays(resolveOutfits(aiResult));
        }
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [closetItems, days, destinations, tripOccasion, resolveOutfits]);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: { index: number | null }[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index != null) {
      setCurrentPage(viewableItems[0].index);
    }
  }).current;

  const destLabel = destinations.join(' → ');

  if (loading) {
    return (
      <View style={styles.container}>
        <SafeAreaView edges={['top']} style={styles.headerArea}>
          <Text style={styles.tripMeta}>{days} days {'\u00B7'} {destLabel} {'\u00B7'} {tripOccasion}</Text>
        </SafeAreaView>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.accentBlue} />
          <Text style={styles.loadingText}>Building your trip wardrobe...</Text>
          <Text style={styles.loadingSubtext}>AI is picking outfits from your closet</Text>
        </View>
      </View>
    );
  }

  if (resolvedDays.length === 0) {
    return (
      <View style={styles.container}>
        <SafeAreaView edges={['top']} style={styles.headerArea}>
          <Text style={styles.tripMeta}>{days} days {'\u00B7'} {destLabel} {'\u00B7'} {tripOccasion}</Text>
        </SafeAreaView>
        <View style={styles.loadingContainer}>
          <Shirt size={32} color={Colors.textTertiary} />
          <Text style={styles.loadingText}>Not enough items in closet</Text>
          <Text style={styles.loadingSubtext}>Add more pieces to generate trip outfits</Text>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.headerArea}>
        <Text style={styles.tripMeta}>{days} days {'\u00B7'} {destLabel} {'\u00B7'} {tripOccasion}</Text>
      </SafeAreaView>

      <FlatList<ResolvedDayOutfit>
        ref={flatListRef}
        data={resolvedDays}
        keyExtractor={(item) => item.label}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
        renderItem={({ item }) => (
          <ScrollView style={styles.page} contentContainerStyle={{ paddingBottom: 80 }} showsVerticalScrollIndicator={false}>
            <View style={styles.dayHeader}>
              <Text style={styles.dayLabel}>{item.label}</Text>
            </View>
            {item.items.map((outfit, i) => (
              <View key={`${outfit.id}_${i}`} style={styles.outfitCard}>
                <Image source={{ uri: outfit.imageUrl }} style={styles.outfitImage} contentFit="contain" />
                <View style={styles.outfitInfo}>
                  <Text style={styles.outfitName}>{outfit.name}</Text>
                  <Text style={styles.outfitCat}>{outfit.category}</Text>
                  {outfit.reused && <Text style={styles.reusedBadge}>Reused</Text>}
                </View>
              </View>
            ))}
          </ScrollView>
        )}
      />

      <View style={styles.dotsRow}>
        {resolvedDays.map((_, i) => (
          <View key={i} style={[styles.dot, currentPage === i && styles.dotActive]} />
        ))}
      </View>

      <SafeAreaView edges={['bottom']} style={styles.actionsRow}>
        <Pressable style={styles.editTripBtn} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}>
          <Pencil size={16} color={Colors.textPrimary} />
          <Text style={styles.editTripText}>Edit Trip</Text>
        </Pressable>
        <Pressable style={styles.saveTripBtn} onPress={() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)}>
          <Check size={16} color="#FFF" />
          <Text style={styles.saveTripText}>Save Trip</Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

function createStyles(C: ReturnType<typeof import('@/contexts/ThemeContext').useThemeColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.background },
    headerArea: { paddingHorizontal: 16, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
    tripMeta: { fontFamily: Typography.bodyFamilyBold, fontSize: 15, color: C.textPrimary, flex: 1, textTransform: 'capitalize' },
    loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    loadingText: { fontFamily: Typography.bodyFamilyBold, fontSize: 16, color: C.textPrimary },
    loadingSubtext: { fontFamily: Typography.bodyFamily, fontSize: 13, color: C.textSecondary },
    backButton: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 12, borderRadius: Radius.pill, backgroundColor: C.cardSurfaceAlt },
    backButtonText: { fontFamily: Typography.bodyFamilyBold, fontSize: 14, color: C.textPrimary },
    page: { width: SCREEN_WIDTH, paddingHorizontal: 16 },
    dayHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, marginTop: 8 },
    dayLabel: { fontFamily: Typography.bodyFamilyBold, fontSize: 22, color: C.textPrimary },
    outfitCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.cardSurface, borderRadius: Radius.lg, padding: 12, gap: 14, marginBottom: 10, borderWidth: 1, borderColor: C.border },
    outfitImage: { width: 72, height: 72, borderRadius: Radius.sm, backgroundColor: C.cardSurfaceAlt },
    outfitInfo: { flex: 1, gap: 2 },
    outfitName: { fontFamily: Typography.bodyFamilyBold, fontSize: 15, color: C.textPrimary },
    outfitCat: { fontFamily: Typography.bodyFamily, fontSize: 12, color: C.textSecondary, textTransform: 'capitalize' },
    reusedBadge: { fontFamily: Typography.bodyFamilyBold, fontSize: 11, color: '#3B82F6', marginTop: 2 },
    dotsRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingVertical: 16 },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.textTertiary },
    dotActive: { backgroundColor: C.textPrimary },
    actionsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 12, paddingTop: 8, paddingBottom: 8 },
    editTripBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderRadius: Radius.pill, backgroundColor: C.cardSurfaceAlt, borderWidth: 1, borderColor: C.border },
    editTripText: { fontFamily: Typography.bodyFamilyBold, fontSize: 15, color: C.textPrimary },
    saveTripBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderRadius: Radius.pill, backgroundColor: '#3B82F6' },
    saveTripText: { fontFamily: Typography.bodyFamilyBold, fontSize: 15, color: '#FFF' },
  });
}
