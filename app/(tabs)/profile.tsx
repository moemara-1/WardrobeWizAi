import { Colors, Radius, Typography } from '@/constants/Colors';
import { useClosetStore } from '@/stores/closetStore';
import * as Haptics from 'expo-haptics';
import { router, type Href } from 'expo-router';
import {
  ChevronRight,
  Grid3X3,
  Heart,
  Layers,
  PersonStanding,
  Settings,
  Shirt,
  User,
  UserCircle,
} from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_COLUMNS = 3;
const GRID_GAP = 2;
const TILE_SIZE = (SCREEN_WIDTH - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS;

type ProfileTab = 'closet' | 'looks' | 'liked';

export default function ProfileScreen() {
  const [activeTab, setActiveTab] = useState<ProfileTab>('closet');
  const items = useClosetStore((s) => s.items);
  const outfits = useClosetStore((s) => s.outfits);
  const digitalTwin = useClosetStore((s) => s.digitalTwin);

  const stats = useMemo(() => ({
    items: items.length,
    outfits: outfits.length,
    looks: outfits.filter((o) => o.pinned).length,
  }), [items, outfits]);

  const gridData = activeTab === 'closet' ? items : activeTab === 'looks' ? outfits : [];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={gridData}
        keyExtractor={(item) => item.id}
        numColumns={activeTab === 'closet' ? GRID_COLUMNS : 1}
        key={activeTab}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.gridContent}
        columnWrapperStyle={activeTab === 'closet' ? styles.gridRow : undefined}
        ListHeaderComponent={
          <>
            {/* Header row */}
            <View style={styles.headerRow}>
              <Text style={styles.screenTitle}>Profile</Text>
              <Pressable
                style={styles.settingsBtn}
                onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
              >
                <Settings size={20} color={Colors.textSecondary} />
              </Pressable>
            </View>

            {/* Avatar + name */}
            <View style={styles.avatarSection}>
              <View style={styles.avatarCircle}>
                {digitalTwin?.selfie_url ? (
                  <Image source={{ uri: digitalTwin.selfie_url }} style={styles.avatarImage} />
                ) : (
                  <User size={32} color={Colors.textTertiary} strokeWidth={1.5} />
                )}
              </View>
              <View style={styles.nameBlock}>
                <Text style={styles.displayName}>User</Text>
                <Text style={styles.handle}>@user</Text>
              </View>
            </View>

            {/* Stats row */}
            <View style={styles.statsRow}>
              <View style={styles.statBlock}>
                <Text style={styles.statValue}>{stats.items}</Text>
                <Text style={styles.statLabel}>Pieces</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBlock}>
                <Text style={styles.statValue}>{stats.outfits}</Text>
                <Text style={styles.statLabel}>Outfits</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBlock}>
                <Text style={styles.statValue}>{stats.looks}</Text>
                <Text style={styles.statLabel}>Pinned</Text>
              </View>
            </View>

            {/* Digital Twin Cards — matching .pen Profile Section */}
            <View style={styles.twinSection}>
              <Pressable
                style={styles.twinCard}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push('/digital-twin' as Href);
                }}
              >
                <View style={styles.twinCardAvatar}>
                  <UserCircle size={22} color={Colors.textTertiary} />
                </View>
                <View style={styles.twinCardMeta}>
                  <Text style={styles.twinCardTitle}>Selfie photo</Text>
                  <Text style={styles.twinCardSub}>Should show your face</Text>
                </View>
                <ChevronRight size={20} color={Colors.textTertiary} />
              </Pressable>

              <Pressable
                style={styles.twinCard}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push('/digital-twin' as Href);
                }}
              >
                <View style={styles.twinCardAvatar}>
                  <PersonStanding size={22} color={Colors.textTertiary} />
                </View>
                <View style={styles.twinCardMeta}>
                  <Text style={styles.twinCardTitle}>Body type</Text>
                  <Text style={styles.twinCardSub}>
                    {digitalTwin?.body_type
                      ? digitalTwin.body_type
                      : 'Set your measurements'}
                  </Text>
                </View>
                <ChevronRight size={20} color={Colors.textTertiary} />
              </Pressable>
            </View>

            {/* Content Tabs — Instagram-style */}
            <View style={styles.tabBar}>
              {([
                { key: 'closet' as ProfileTab, Icon: Grid3X3 },
                { key: 'looks' as ProfileTab, Icon: Layers },
                { key: 'liked' as ProfileTab, Icon: Heart },
              ]).map((tab) => (
                <Pressable
                  key={tab.key}
                  style={[styles.tabItem, activeTab === tab.key && styles.tabItemActive]}
                  onPress={() => { Haptics.selectionAsync(); setActiveTab(tab.key); }}
                >
                  <tab.Icon size={20} color={activeTab === tab.key ? Colors.textPrimary : Colors.textTertiary} />
                </Pressable>
              ))}
            </View>
          </>
        }
        renderItem={({ item }: { item: any }) => {
          if (activeTab === 'closet') {
            return (
              <Pressable
                style={styles.gridTile}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push(`/item/${item.id}` as Href);
                }}
              >
                <Image
                  source={{ uri: item.clean_image_url || item.image_url }}
                  style={styles.gridImage}
                  contentFit="cover"
                />
              </Pressable>
            );
          }
          // Looks / outfits
          return (
            <View style={styles.outfitCard}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.outfitItems}>
                {item.items.map((oi: any) => (
                  <View key={oi.id} style={styles.outfitThumb}>
                    <Image
                      source={{ uri: oi.clean_image_url || oi.image_url }}
                      style={styles.outfitThumbImage}
                      contentFit="contain"
                    />
                  </View>
                ))}
              </ScrollView>
              <View style={styles.outfitInfo}>
                <Shirt size={14} color={Colors.textTertiary} />
                <Text style={styles.outfitName}>{item.name}</Text>
                <Text style={styles.outfitCount}>{item.items.length} pieces</Text>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyGrid}>
            <Text style={styles.emptyGridText}>
              {activeTab === 'closet'
                ? 'No pieces in your closet yet'
                : activeTab === 'looks'
                  ? 'No outfits saved yet'
                  : 'No liked items yet'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  gridContent: { paddingBottom: 120 },
  gridRow: { gap: GRID_GAP },

  // Header
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  screenTitle: { fontFamily: Typography.serifFamilyBold, fontSize: 24, color: Colors.textPrimary },
  settingsBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.cardSurfaceAlt, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },

  // Avatar
  avatarSection: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 20, paddingBottom: 16 },
  avatarCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.cardSurfaceAlt, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.border, overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  nameBlock: { gap: 2 },
  displayName: { fontFamily: Typography.bodyFamilyBold, fontSize: 20, color: Colors.textPrimary },
  handle: { fontFamily: Typography.bodyFamily, fontSize: 14, color: Colors.textSecondary },

  // Stats
  statsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: 16, backgroundColor: Colors.cardSurface, borderRadius: Radius.lg, paddingVertical: 14, borderWidth: 1, borderColor: Colors.border, marginBottom: 16 },
  statBlock: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: { fontFamily: Typography.bodyFamilyBold, fontSize: 18, color: Colors.textPrimary },
  statLabel: { fontFamily: Typography.bodyFamily, fontSize: 12, color: Colors.textSecondary },
  statDivider: { width: 1, height: 28, backgroundColor: Colors.border },

  // Twin cards (matching .pen Profile Section)
  twinSection: { paddingHorizontal: 16, gap: 8, marginBottom: 16 },
  twinCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#16161A', borderRadius: 14, height: 66, paddingHorizontal: 16, gap: 14 },
  twinCardAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#2A2A2E', alignItems: 'center', justifyContent: 'center' },
  twinCardMeta: { flex: 1, gap: 2 },
  twinCardTitle: { fontFamily: Typography.bodyFamilyBold, fontSize: 15, color: '#FAFAF9' },
  twinCardSub: { fontFamily: Typography.bodyFamily, fontSize: 13, color: '#6B6B70' },

  // Tab bar (IG-style)
  tabBar: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: Colors.border, borderBottomWidth: 1, borderBottomColor: Colors.border, marginBottom: GRID_GAP },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  tabItemActive: { borderBottomWidth: 2, borderBottomColor: Colors.textPrimary },

  // Closet grid
  gridTile: { width: TILE_SIZE, height: TILE_SIZE, backgroundColor: '#FFFFFF' },
  gridImage: { width: '100%', height: '100%' },

  // Outfit cards
  outfitCard: { marginHorizontal: 16, marginBottom: 14, backgroundColor: Colors.cardSurface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  outfitItems: { padding: 12, gap: 8 },
  outfitThumb: { width: 64, height: 64, borderRadius: 10, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  outfitThumbImage: { width: '85%', height: '85%' },
  outfitInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1, borderTopColor: Colors.border },
  outfitName: { fontFamily: Typography.bodyFamilyBold, fontSize: 14, color: Colors.textPrimary, flex: 1 },
  outfitCount: { fontFamily: Typography.bodyFamily, fontSize: 12, color: Colors.textSecondary },

  // Empty state
  emptyGrid: { paddingVertical: 60, alignItems: 'center' },
  emptyGridText: { fontFamily: Typography.bodyFamily, fontSize: 14, color: Colors.textTertiary },
});
