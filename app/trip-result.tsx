import { Radius, Typography } from '@/constants/Colors';
import { useThemeColors } from '@/contexts/ThemeContext';
import { generateTripPlan, TripDayPlan } from '@/lib/ai';
import { useClosetStore } from '@/stores/closetStore';
import { ClosetItem } from '@/types';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { Check, List, Pencil, Sparkles } from 'lucide-react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface DayOutfit {
  label: string;
  items: { name: string; category: string; imageUrl: string; reused: boolean }[];
}

// Simple slot-based outfit builder from real closet items
function buildTripOutfits(items: ClosetItem[], numDays: number, occasion: string): DayOutfit[] {
  if (items.length === 0) return [];

  const tops = items.filter(i => ['top', 'outerwear', 'dress'].includes(i.category));
  const bottoms = items.filter(i => ['bottom'].includes(i.category));
  const shoes = items.filter(i => ['shoe'].includes(i.category));
  const accessories = items.filter(i => ['accessory', 'bag', 'hat', 'jewelry'].includes(i.category));

  // If very few items, just use all items we have
  const allPooled = items.length < 4;

  const days: DayOutfit[] = [];
  const usedIds = new Set<string>();

  for (let d = 0; d < numDays + 1; d++) {
    const label = d === 0 ? 'Travel Day' : `Day ${d}`;
    const dayItems: DayOutfit['items'] = [];

    const pick = (pool: ClosetItem[]): ClosetItem | null => {
      // Prefer unused, but allow reuse
      const unused = pool.filter(p => !usedIds.has(p.id));
      const chosen = unused.length > 0
        ? unused[d % unused.length]
        : pool.length > 0 ? pool[d % pool.length] : null;
      if (chosen) {
        const reused = usedIds.has(chosen.id);
        usedIds.add(chosen.id);
        dayItems.push({
          name: chosen.name,
          category: chosen.category,
          imageUrl: chosen.clean_image_url || chosen.image_url,
          reused,
        });
      }
      return chosen;
    };

    if (allPooled) {
      // Rotate through all items
      const idx = d % items.length;
      const item = items[idx];
      dayItems.push({
        name: item.name,
        category: item.category,
        imageUrl: item.clean_image_url || item.image_url,
        reused: usedIds.has(item.id),
      });
      usedIds.add(item.id);
      // Add one more if available
      if (items.length > 1) {
        const item2 = items[(idx + 1) % items.length];
        dayItems.push({
          name: item2.name,
          category: item2.category,
          imageUrl: item2.clean_image_url || item2.image_url,
          reused: usedIds.has(item2.id),
        });
        usedIds.add(item2.id);
      }
    } else {
      if (tops.length > 0) pick(tops);
      if (bottoms.length > 0) pick(bottoms);
      if (shoes.length > 0) pick(shoes);
      if (accessories.length > 0 && d % 2 === 0) pick(accessories);
    }

    if (dayItems.length > 0) {
      days.push({ label, items: dayItems });
    }
  }

  return days.length > 0 ? days : [{
    label: 'Day 1',
    items: items.slice(0, 3).map(i => ({
      name: i.name,
      category: i.category,
      imageUrl: i.clean_image_url || i.image_url,
      reused: false,
    })),
  }];
}

export default function TripResultScreen() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const [currentPage, setCurrentPage] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const params = useLocalSearchParams<{ days?: string; destination?: string; occasion?: string }>();
  const closetItems = useClosetStore((s) => s.items);

  const numDays = parseInt(params.days || '3', 10);
  const destination = params.destination || 'Your Trip';
  const occasion = params.occasion || 'fun';

  const [aiPlans, setAiPlans] = useState<TripDayPlan[]>([]);
  const [aiLoading, setAiLoading] = useState(true);

  useEffect(() => {
    const destinations = destination.split(',').map(d => d.trim()).filter(Boolean);
    const closetSummary = closetItems.slice(0, 20).map(i => `${i.name} (${i.category}${i.brand ? `, ${i.brand}` : ''})`).join(', ');
    generateTripPlan(destinations, occasion, numDays, closetSummary)
      .then(setAiPlans)
      .catch(() => setAiPlans([]))
      .finally(() => setAiLoading(false));
  }, [destination, occasion, numDays]);

  const tripDays = useMemo(
    () => buildTripOutfits(closetItems, numDays, occasion),
    [closetItems, numDays, occasion],
  );

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: { index: number | null }[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index != null) {
      setCurrentPage(viewableItems[0].index);
    }
  }).current;

  if (tripDays.length === 0) {
    return (
      <View style={styles.container}>
        <SafeAreaView edges={['top']} style={styles.headerArea}>
          <Text style={styles.tripMeta}>{destination}</Text>
        </SafeAreaView>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <Text style={{ fontFamily: Typography.bodyFamilyBold, fontSize: 18, color: Colors.textPrimary, textAlign: 'center' }}>
            Not enough items
          </Text>
          <Text style={{ fontFamily: Typography.bodyFamily, fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginTop: 6 }}>
            Add some clothes to your closet first, then come back to plan your trip!
          </Text>
          <Pressable
            style={{ marginTop: 20, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24, backgroundColor: Colors.accentGreen }}
            onPress={() => router.back()}
          >
            <Text style={{ fontFamily: Typography.bodyFamilyBold, fontSize: 15, color: Colors.background }}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.headerArea}>
        <Text style={styles.tripMeta}>{numDays} days {'\u00B7'} {destination} {'\u00B7'} {occasion}</Text>
        <Pressable style={styles.listBtn}>
          <List size={18} color={Colors.textPrimary} />
        </Pressable>
      </SafeAreaView>

      <FlatList<DayOutfit>
        ref={flatListRef} data={tripDays} keyExtractor={(item) => item.label}
        horizontal pagingEnabled showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
        renderItem={({ item, index }) => {
          const aiPlan = aiPlans[index];
          return (
            <ScrollView style={styles.page} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
              <View style={styles.dayHeader}>
                <Text style={styles.dayLabel}>{item.label}</Text>
                <Pressable style={styles.editBtn}><Pencil size={16} color={Colors.textPrimary} /></Pressable>
              </View>

              {/* AI Plan Card */}
              {(aiLoading || aiPlan) && (
                <View style={styles.aiCard}>
                  <View style={styles.aiCardHeader}>
                    <Sparkles size={14} color={Colors.accentBlue} />
                    <Text style={styles.aiCardTitle}>AI Stylist</Text>
                  </View>
                  {aiLoading ? (
                    <ActivityIndicator size="small" color={Colors.textTertiary} style={{ marginVertical: 8 }} />
                  ) : aiPlan ? (
                    <>
                      <Text style={styles.aiCardText}>{aiPlan.outfitSuggestion}</Text>
                      <View style={styles.aiDivider} />
                      <Text style={styles.aiCardLabel}>Activities</Text>
                      <Text style={styles.aiCardText}>{aiPlan.activities}</Text>
                      <View style={styles.aiDivider} />
                      <Text style={styles.aiCardLabel}>Packing tip</Text>
                      <Text style={styles.aiCardText}>{aiPlan.packingTips}</Text>
                    </>
                  ) : null}
                </View>
              )}

              {item.items.map((outfit, i) => (
                <View key={i} style={styles.outfitCard}>
                  <Image source={{ uri: outfit.imageUrl }} style={styles.outfitImage} contentFit="contain" />
                  <View style={styles.outfitInfo}>
                    <Text style={styles.outfitName}>{outfit.name}</Text>
                    <Text style={styles.outfitCat}>{outfit.category}</Text>
                    {outfit.reused && <Text style={styles.reusedBadge}>Reused</Text>}
                  </View>
                </View>
              ))}
            </ScrollView>
          );
        }}
      />

      <View style={styles.dotsRow}>
        {tripDays.map((_, i) => (
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

function createStyles(C: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.background },
    headerArea: { paddingHorizontal: 16, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
    tripMeta: { fontFamily: Typography.bodyFamilyBold, fontSize: 15, color: C.textPrimary, flex: 1, textTransform: 'capitalize' },
    listBtn: { width: 36, height: 36, borderRadius: Radius.sm, backgroundColor: C.cardSurfaceAlt, alignItems: 'center', justifyContent: 'center' },
    page: { width: SCREEN_WIDTH, paddingHorizontal: 16 },
    dayHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, marginTop: 8 },
    dayLabel: { fontFamily: Typography.bodyFamilyBold, fontSize: 22, color: C.textPrimary },
    editBtn: { width: 36, height: 36, borderRadius: Radius.sm, backgroundColor: C.cardSurfaceAlt, alignItems: 'center', justifyContent: 'center' },
    aiCard: { backgroundColor: C.cardSurface, borderRadius: Radius.lg, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: C.border, gap: 6 },
    aiCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
    aiCardTitle: { fontFamily: Typography.bodyFamilyBold, fontSize: 13, color: '#3B82F6' },
    aiCardLabel: { fontFamily: Typography.bodyFamilyBold, fontSize: 12, color: C.textSecondary, marginTop: 2 },
    aiCardText: { fontFamily: Typography.bodyFamily, fontSize: 13, color: C.textPrimary, lineHeight: 19 },
    aiDivider: { height: 1, backgroundColor: C.border, marginVertical: 6 },
    outfitCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.cardSurface, borderRadius: Radius.lg, padding: 12, gap: 14, marginBottom: 10, borderWidth: 1, borderColor: C.border },
    outfitImage: { width: 72, height: 72, borderRadius: Radius.sm, backgroundColor: '#FFFFFF' },
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
