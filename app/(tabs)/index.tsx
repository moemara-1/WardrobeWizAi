import { CategoryPills } from '@/components/ui/CategoryPills';
import { PinCard } from '@/components/ui/PinCard';
import { Colors, Radius, Typography } from '@/constants/Colors';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import {
  Clock,
  Plane,
  Plus,
  ScanLine,
  Search
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type SubView = 'explore' | 'discover';

const EXPLORE_CATEGORIES = ['All', 'Trending', 'New', 'Streetwear', 'Minimal', 'Vintage', 'Formal'];

const EXPLORE_PINS = [
  { id: 'e1', imageUrl: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=400', title: 'Summer layers', username: 'stylebyella', likes: 234, height: 220 },
  { id: 'e2', imageUrl: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=400', title: 'Monochrome fit', username: 'urban.fits', likes: 187, height: 260 },
  { id: 'e3', imageUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400', title: 'Street casual', username: 'fashionkid', likes: 412, height: 240 },
  { id: 'e4', imageUrl: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=400', title: 'Date night look', username: 'vibecheck', likes: 89, height: 200 },
  { id: 'e5', imageUrl: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=400', title: 'Boho vibes', username: 'earthtones', likes: 156, height: 280 },
  { id: 'e6', imageUrl: 'https://images.unsplash.com/photo-1485968579580-b6d095142e6e?w=400', title: 'Vintage denim', username: 'retrostyle', likes: 321, height: 210 },
  { id: 'e7', imageUrl: 'https://images.unsplash.com/photo-1558171813-4c088753af8f?w=400', title: 'Oversized fit', username: 'bigsilhouette', likes: 98, height: 250 },
  { id: 'e8', imageUrl: 'https://images.unsplash.com/photo-1544441893-675973e31985?w=400', title: 'Jacket season', username: 'layergame', likes: 445, height: 230 },
];

const SHORTCUTS = [
  { key: 'tryon', label: 'Try On', icon: ScanLine, route: '/virtual-try-on' },
  { key: 'trip', label: 'Trip Planner', icon: Plane, route: '/trip-planner' },
  { key: 'add', label: 'Add Piece', icon: Plus, route: null },
] as const;

const RECENTLY_VIEWED = [
  { id: 'rv1', imageUrl: 'https://images.unsplash.com/photo-1544441893-675973e31985?w=200', name: '1996 Retro Nuptse' },
  { id: 'rv2', imageUrl: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=200', name: 'Classic Blue Denim' },
  { id: 'rv3', imageUrl: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=200', name: 'AJ1 Retro High' },
  { id: 'rv4', imageUrl: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=200', name: 'Essential White Tee' },
];

const DISCOVER_USERS = [
  {
    id: 'u1', username: 'stylebyella',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100',
    itemCount: 142,
    previews: [
      'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=200',
      'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=200',
      'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=200',
    ],
  },
  {
    id: 'u2', username: 'urban.fits',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100',
    itemCount: 89,
    previews: [
      'https://images.unsplash.com/photo-1544441893-675973e31985?w=200',
      'https://images.unsplash.com/photo-1542272604-787c3835535d?w=200',
      'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=200',
    ],
  },
  {
    id: 'u3', username: 'retrostyle',
    avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100',
    itemCount: 63,
    previews: [
      'https://images.unsplash.com/photo-1485968579580-b6d095142e6e?w=200',
      'https://images.unsplash.com/photo-1558171813-4c088753af8f?w=200',
      'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=200',
    ],
  },
];

export default function CommunityScreen() {
  const [activeView, setActiveView] = useState<SubView>('explore');
  const [searchQuery, setSearchQuery] = useState('');
  const [exploreCategory, setExploreCategory] = useState('All');
  const [showAddSheet, setShowAddSheet] = useState(false);

  const switchView = (view: SubView) => {
    Haptics.selectionAsync();
    setActiveView(view);
  };

  const handleShortcutPress = (shortcut: (typeof SHORTCUTS)[number]) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (shortcut.route) {
      router.push(shortcut.route as never);
    } else if (shortcut.key === 'add') {
      setShowAddSheet(true);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {activeView === 'explore' ? 'Explore' : 'Discover'}
        </Text>
        <View style={styles.toggleRow}>
          <Pressable
            style={[styles.toggleTab, activeView === 'explore' && styles.toggleTabActive]}
            onPress={() => switchView('explore')}
          >
            <Text style={[styles.toggleText, activeView === 'explore' && styles.toggleTextActive]}>
              Explore
            </Text>
          </Pressable>
          <Pressable
            style={[styles.toggleTab, activeView === 'discover' && styles.toggleTabActive]}
            onPress={() => switchView('discover')}
          >
            <Text style={[styles.toggleText, activeView === 'discover' && styles.toggleTextActive]}>
              Discover
            </Text>
          </Pressable>
        </View>
      </View>

      {activeView === 'explore' ? (
        <ExploreView category={exploreCategory} onCategoryChange={setExploreCategory} />
      ) : (
        <DiscoverView
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onShortcutPress={handleShortcutPress}
        />
      )}
    </SafeAreaView>
  );
}

function ExploreView({
  category,
  onCategoryChange,
}: {
  category: string;
  onCategoryChange: (c: string) => void;
}) {
  const leftColumn = EXPLORE_PINS.filter((_, i) => i % 2 === 0);
  const rightColumn = EXPLORE_PINS.filter((_, i) => i % 2 === 1);

  return (
    <FlatList
      data={[1]}
      keyExtractor={() => 'explore-masonry'}
      renderItem={() => (
        <View style={styles.masonry}>
          <View style={styles.column}>
            {leftColumn.map((pin) => (
              <PinCard
                key={pin.id}
                imageUrl={pin.imageUrl}
                title={pin.title}
                username={pin.username}
                likes={pin.likes}
                height={pin.height}
              />
            ))}
          </View>
          <View style={styles.column}>
            {rightColumn.map((pin) => (
              <PinCard
                key={pin.id}
                imageUrl={pin.imageUrl}
                title={pin.title}
                username={pin.username}
                likes={pin.likes}
                height={pin.height}
              />
            ))}
          </View>
        </View>
      )}
      ListHeaderComponent={
        <CategoryPills
          categories={EXPLORE_CATEGORIES}
          activeCategory={category}
          onSelect={onCategoryChange}
        />
      }
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.listContent}
    />
  );
}

function DiscoverView({
  searchQuery,
  onSearchChange,
  onShortcutPress,
}: {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onShortcutPress: (s: (typeof SHORTCUTS)[number]) => void;
}) {
  const query = searchQuery.toLowerCase().trim();

  const filteredRecent = query
    ? RECENTLY_VIEWED.filter((item) => item.name.toLowerCase().includes(query))
    : RECENTLY_VIEWED;

  const filteredUsers = query
    ? DISCOVER_USERS.filter((user) => user.username.toLowerCase().includes(query))
    : DISCOVER_USERS;

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
      <View style={styles.searchBar}>
        <Search size={18} color={Colors.textTertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search closets, styles..."
          placeholderTextColor={Colors.textTertiary}
          value={searchQuery}
          onChangeText={onSearchChange}
          returnKeyType="search"
          autoCorrect={false}
        />
      </View>

      {/* Shortcuts */}
      {!query && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Shortcuts</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.shortcutsRow}>
            {SHORTCUTS.map((shortcut) => (
              <Pressable
                key={shortcut.key}
                style={styles.shortcutItem}
                onPress={() => onShortcutPress(shortcut)}
              >
                <View style={styles.shortcutCircle}>
                  <shortcut.icon size={20} color={Colors.textPrimary} />
                </View>
                <Text style={styles.shortcutLabel}>{shortcut.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </>
      )}

      {/* Recently Viewed */}
      {filteredRecent.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Clock size={16} color={Colors.textSecondary} />
            <Text style={styles.sectionTitle}>Recently Viewed</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recentRow}>
            {filteredRecent.map((item) => (
              <Pressable key={item.id} style={styles.recentItem}>
                <Image source={{ uri: item.imageUrl }} style={styles.recentImage} />
                <Text style={styles.recentName} numberOfLines={1}>{item.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </>
      )}

      {/* Discover Users */}
      {filteredUsers.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Discover</Text>
          </View>
          {filteredUsers.map((user) => (
            <Pressable
              key={user.id}
              style={styles.userCard}
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
            >
              <View style={styles.userCardHeader}>
                <Image source={{ uri: user.avatarUrl }} style={styles.userAvatar} />
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{user.username}</Text>
                  <Text style={styles.userItemCount}>{user.itemCount} items</Text>
                </View>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.previewStrip}>
                {user.previews.map((uri, i) => (
                  <Image key={i} source={{ uri }} style={styles.previewImage} />
                ))}
              </ScrollView>
            </Pressable>
          ))}
        </>
      )}

      {query && filteredRecent.length === 0 && filteredUsers.length === 0 && (
        <View style={{ alignItems: 'center', paddingTop: 40 }}>
          <Text style={{ fontFamily: Typography.bodyFamily, fontSize: 15, color: Colors.textTertiary }}>
            No results for "{searchQuery}"
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 16, paddingTop: 8, gap: 12, marginBottom: 12 },
  headerTitle: { fontFamily: Typography.serifFamilyBold, fontSize: 28, color: Colors.textPrimary },
  toggleRow: { flexDirection: 'row', backgroundColor: Colors.cardSurfaceAlt, borderRadius: Radius.pill, padding: 3, borderWidth: 1, borderColor: Colors.border },
  toggleTab: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: Radius.pill },
  toggleTabActive: { backgroundColor: Colors.textPrimary },
  toggleText: { fontFamily: Typography.bodyFamilyMedium, fontSize: 13, color: Colors.textSecondary },
  toggleTextActive: { color: Colors.background },
  listContent: { paddingBottom: 120 },
  masonry: { flexDirection: 'row', paddingHorizontal: 12, gap: 8, marginTop: 8 },
  column: { flex: 1 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.cardSurfaceAlt, borderRadius: Radius.input, marginHorizontal: 16, paddingHorizontal: 14, paddingVertical: 12, gap: 10, borderWidth: 1, borderColor: Colors.border },
  searchInput: { flex: 1, fontFamily: Typography.bodyFamily, fontSize: 15, color: Colors.textPrimary, padding: 0 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingTop: 20, paddingBottom: 12 },
  sectionTitle: { fontFamily: Typography.bodyFamilyBold, fontSize: 16, color: Colors.textPrimary },
  shortcutsRow: { paddingHorizontal: 16, gap: 16 },
  shortcutItem: { alignItems: 'center', gap: 6, width: 64 },
  shortcutCircle: { width: 52, height: 52, borderRadius: 26, backgroundColor: Colors.cardSurfaceAlt, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  shortcutLabel: { fontFamily: Typography.bodyFamily, fontSize: 11, color: Colors.textSecondary, textAlign: 'center' },
  recentRow: { paddingHorizontal: 16, gap: 12 },
  recentItem: { width: 80, gap: 4 },
  recentImage: { width: 80, height: 80, borderRadius: Radius.sm, backgroundColor: Colors.cardSurfaceAlt },
  recentName: { fontFamily: Typography.bodyFamily, fontSize: 11, color: Colors.textSecondary },
  userCard: { marginHorizontal: 16, marginBottom: 16, backgroundColor: Colors.cardSurface, borderRadius: Radius.lg, padding: 14, borderWidth: 1, borderColor: Colors.border, gap: 12 },
  userCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  userAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.borderLight },
  userInfo: { flex: 1, gap: 2 },
  userName: { fontFamily: Typography.bodyFamilyBold, fontSize: 14, color: Colors.textPrimary },
  userItemCount: { fontFamily: Typography.bodyFamily, fontSize: 12, color: Colors.textSecondary },
  previewStrip: { gap: 8 },
  previewImage: { width: 80, height: 100, borderRadius: Radius.sm, backgroundColor: Colors.cardSurfaceAlt },
});
