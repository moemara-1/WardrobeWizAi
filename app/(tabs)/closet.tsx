import { AddToClosetSheet } from '@/components/ui/AddToClosetSheet';
import { Colors, Radius, Typography } from '@/constants/Colors';
import { useClosetStore } from '@/stores/closetStore';
import { ClosetItem } from '@/types';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Plus } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const NUM_COLUMNS = 3;
const GRID_GAP = 2;
const ITEM_SIZE = (SCREEN_WIDTH - GRID_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;

type ClosetTab = 'pieces' | 'fits' | 'collections';

const FILTER_PILLS = ['All', 'Favorites', 'Category', 'Type', 'Color'] as const;

const MOCK_ITEMS: ClosetItem[] = [
  { id: '1', user_id: 'demo', image_url: 'https://images.unsplash.com/photo-1544441893-675973e31985?w=400', name: '1996 Retro Nuptse', category: 'outerwear', brand: 'The North Face', colors: ['black', 'red'], detected_confidence: 0.95, tags: ['vintage', 'streetwear'], wear_count: 12, favorite: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '2', user_id: 'demo', image_url: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400', name: 'Classic Blue Denim', category: 'bottom', brand: "Levi's", colors: ['blue'], detected_confidence: 0.92, tags: ['casual'], wear_count: 28, favorite: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '3', user_id: 'demo', image_url: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400', name: 'AJ1 Retro High', category: 'shoe', brand: 'Nike', colors: ['red', 'black', 'white'], detected_confidence: 0.98, tags: ['sneakers'], wear_count: 8, favorite: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '4', user_id: 'demo', image_url: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=400', name: 'Essential White Tee', category: 'top', colors: ['white'], detected_confidence: 0.88, tags: ['basic'], wear_count: 42, favorite: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '5', user_id: 'demo', image_url: 'https://images.unsplash.com/photo-1622470953794-aa9c70b0fb9d?w=400', name: 'Oversized Hoodie', category: 'top', brand: 'Essentials', colors: ['black'], detected_confidence: 0.91, tags: ['streetwear'], wear_count: 15, favorite: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '6', user_id: 'demo', image_url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400', name: 'Canvas Backpack', category: 'bag', brand: 'Herschel', colors: ['brown', 'tan'], detected_confidence: 0.87, tags: ['school'], wear_count: 50, favorite: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

export default function ClosetScreen() {
  const [activeTab, setActiveTab] = useState<ClosetTab>('pieces');
  const [activeFilter, setActiveFilter] = useState('All');
  const [showAddSheet, setShowAddSheet] = useState(false);
  const { setItems, items } = useClosetStore();

  useEffect(() => {
    if (items.length === 0) setItems(MOCK_ITEMS);
  }, []);

  const displayItems = activeFilter === 'Favorites'
    ? items.filter((i) => i.favorite)
    : items;

  const handleAddSheetAction = (action: string) => {
    setShowAddSheet(false);
    if (action === 'search') {
      router.push('/search-to-add' as never);
    } else if (action === 'import') {
      router.push('/import-fit-pic' as never);
    } else if (action === 'camera') {
      router.push('/analyze' as never);
    } else if (action === 'library') {
      router.push('/analyze' as never);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top Tabs */}
      <View style={styles.topTabs}>
        {(['pieces', 'fits', 'collections'] as ClosetTab[]).map((tab) => (
          <Pressable
            key={tab}
            style={styles.topTab}
            onPress={() => { Haptics.selectionAsync(); setActiveTab(tab); }}
          >
            <Text style={[styles.topTabText, activeTab === tab && styles.topTabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
            {activeTab === tab && <View style={styles.topTabIndicator} />}
          </Pressable>
        ))}
      </View>

      {/* Filter Pills */}
      <View style={styles.filterWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {FILTER_PILLS.map((pill) => {
            const isActive = pill === activeFilter;
            return (
              <Pressable
                key={pill}
                style={[styles.filterPill, isActive && styles.filterPillActive]}
                onPress={() => { Haptics.selectionAsync(); setActiveFilter(pill); }}
              >
                <Text style={[styles.filterPillText, isActive && styles.filterPillTextActive]}>
                  {pill}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Grid */}
      <FlatList
        data={displayItems}
        keyExtractor={(item) => item.id}
        numColumns={NUM_COLUMNS}
        renderItem={({ item }) => (
          <Pressable
            style={styles.gridItem}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push(`/item/${item.id}` as never);
            }}
          >
            <Image source={{ uri: item.clean_image_url || item.image_url }} style={styles.gridImage} resizeMode="contain" />
          </Pressable>
        )}
        contentContainerStyle={styles.gridContent}
        showsVerticalScrollIndicator={false}
        columnWrapperStyle={styles.gridRow}
      />

      {/* Floating + FAB — positioned above the tab bar */}
      <Pressable
        style={styles.fab}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          setShowAddSheet(true);
        }}
      >
        <Plus size={26} color="#FFFFFF" />
      </Pressable>

      <AddToClosetSheet
        visible={showAddSheet}
        onClose={() => setShowAddSheet(false)}
        onAction={handleAddSheetAction}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  topTabs: { flexDirection: 'row', paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  topTab: { flex: 1, alignItems: 'center', paddingVertical: 12, position: 'relative' },
  topTabText: { fontFamily: Typography.bodyFamilyMedium, fontSize: 15, color: Colors.textTertiary },
  topTabTextActive: { fontFamily: Typography.bodyFamilyBold, color: Colors.textPrimary },
  topTabIndicator: { position: 'absolute', bottom: 0, left: 16, right: 16, height: 2, backgroundColor: Colors.textPrimary, borderRadius: 1 },
  filterWrapper: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  filterRow: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  filterPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: Radius.pill, backgroundColor: Colors.cardSurfaceAlt, borderWidth: 1, borderColor: Colors.border },
  filterPillActive: { backgroundColor: Colors.textPrimary, borderColor: Colors.textPrimary },
  filterPillText: { fontFamily: Typography.bodyFamilyMedium, fontSize: 13, color: Colors.textSecondary },
  filterPillTextActive: { color: Colors.background },
  gridContent: { paddingBottom: 100 },
  gridRow: { gap: GRID_GAP },
  gridItem: { width: ITEM_SIZE, height: ITEM_SIZE, backgroundColor: '#FFFFFF', marginBottom: GRID_GAP },
  gridImage: { width: '100%', height: '100%' },
  fab: { position: 'absolute', bottom: 90, alignSelf: 'center', width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.textPrimary, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
});
