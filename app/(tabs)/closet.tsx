import { AddToClosetSheet } from '@/components/ui/AddToClosetSheet';
import { Colors, Radius, Typography } from '@/constants/Colors';
import { useClosetStore } from '@/stores/closetStore';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { Plus, Sparkles } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
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

export default function ClosetScreen() {
  const [activeTab, setActiveTab] = useState<ClosetTab>('pieces');
  const [activeFilter, setActiveFilter] = useState('All');
  const [showAddSheet, setShowAddSheet] = useState(false);
  const items = useClosetStore((s) => s.items);
  const outfits = useClosetStore((s) => s.outfits);

  const displayItems = activeFilter === 'Favorites'
    ? items.filter((i) => i.favorite)
    : items;

  const pickFromCamera = useCallback(async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      router.push({ pathname: '/analyze', params: { imageUri: result.assets[0].uri } } as never);
    }
  }, []);

  const pickFromLibrary = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      router.push({ pathname: '/analyze', params: { imageUri: result.assets[0].uri } } as never);
    }
  }, []);

  const handleAddSheetAction = (action: string) => {
    setShowAddSheet(false);
    if (action === 'search') {
      router.push('/search-to-add' as never);
    } else if (action === 'import') {
      router.push('/import-fit-pic' as never);
    } else if (action === 'camera') {
      pickFromCamera();
    } else if (action === 'library') {
      pickFromLibrary();
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
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

      {activeTab === 'pieces' && (
        <>
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

          {displayItems.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No pieces yet</Text>
              <Text style={styles.emptySubtitle}>Take a photo or pick from your library to add your first piece</Text>
              <Pressable style={styles.emptyBtn} onPress={() => setShowAddSheet(true)}>
                <Plus size={18} color={Colors.background} />
                <Text style={styles.emptyBtnText}>Add Piece</Text>
              </Pressable>
            </View>
          ) : (
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
          )}
        </>
      )}

      {activeTab === 'fits' && (
        <View style={styles.emptyState}>
          {outfits.length === 0 ? (
            <>
              <Sparkles size={32} color={Colors.textTertiary} strokeWidth={1.2} />
              <Text style={styles.emptyTitle}>No fits saved</Text>
              <Text style={styles.emptySubtitle}>
                Create and save outfits from the Stylist tab to see them here
              </Text>
            </>
          ) : (
            <FlatList
              data={outfits}
              keyExtractor={(o) => o.id}
              renderItem={({ item: outfit }) => (
                <View style={styles.fitCard}>
                  <Text style={styles.fitCardTitle}>{outfit.name}</Text>
                  <Text style={styles.fitCardSubtitle}>
                    {outfit.items.length} pieces · {outfit.occasion || 'casual'}
                  </Text>
                </View>
              )}
              contentContainerStyle={styles.gridContent}
            />
          )}
        </View>
      )}

      {activeTab === 'collections' && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No collections yet</Text>
          <Text style={styles.emptySubtitle}>
            Organize your pieces and fits into collections
          </Text>
        </View>
      )}

      <Pressable
        style={styles.fab}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          setShowAddSheet(true);
        }}
      >
        <Plus size={26} color={Colors.background} />
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
  gridContent: { paddingBottom: 120 },
  gridRow: { gap: GRID_GAP },
  gridItem: { width: ITEM_SIZE, height: ITEM_SIZE, backgroundColor: '#FFFFFF', marginBottom: GRID_GAP },
  gridImage: { width: '100%', height: '100%' },
  fab: { position: 'absolute', bottom: 100, alignSelf: 'center', width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.accentGreen, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 12 },
  emptyTitle: { fontFamily: Typography.bodyFamilyBold, fontSize: 18, color: Colors.textPrimary },
  emptySubtitle: { fontFamily: Typography.bodyFamily, fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 12, borderRadius: Radius.pill, backgroundColor: Colors.accentGreen, marginTop: 8 },
  emptyBtnText: { fontFamily: Typography.bodyFamilyBold, fontSize: 14, color: Colors.background },
  fitCard: { marginHorizontal: 16, marginBottom: 12, padding: 16, backgroundColor: Colors.cardSurface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border },
  fitCardTitle: { fontFamily: Typography.bodyFamilyBold, fontSize: 16, color: Colors.textPrimary },
  fitCardSubtitle: { fontFamily: Typography.bodyFamily, fontSize: 13, color: Colors.textSecondary, marginTop: 4, textTransform: 'capitalize' },
});
