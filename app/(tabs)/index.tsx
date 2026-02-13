import { Radius, Typography } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { useThemeColors } from '@/contexts/ThemeContext';
import { useClosetStore } from '@/stores/closetStore';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, type Href } from 'expo-router';
import {
  Camera,
  ImageIcon,
  Plane,
  ScanLine,
  Search,
  Sparkles
} from 'lucide-react-native';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type SubView = 'explore' | 'discover';

// Masonry photo data — clean fashion photos for Explore (matching .pen)
const EXPLORE_PHOTOS_LEFT = [
  { id: 'e1', imageUrl: 'https://images.unsplash.com/photo-1608635680046-aebf91c1a9c8?w=400', height: 320 },
  { id: 'e3', imageUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400', height: 260 },
  { id: 'e5', imageUrl: 'https://images.unsplash.com/photo-1576507169637-cdcff61eb6d5?w=400', height: 300 },
];

const EXPLORE_PHOTOS_RIGHT = [
  { id: 'e2', imageUrl: 'https://images.unsplash.com/photo-1622021211530-7d31fd86862d?w=400', height: 240 },
  { id: 'e4', imageUrl: 'https://images.unsplash.com/photo-1683488780206-88ce4240f3da?w=400', height: 340 },
  { id: 'e6', imageUrl: 'https://images.unsplash.com/photo-1612694831097-d7cd14379928?w=400', height: 280 },
];

const SHORTCUTS = [
  { key: 'stylist', label: 'StyleAI', icon: Sparkles, route: '/style-chat' },
  { key: 'tryon', label: 'Try On', icon: ScanLine, route: '/virtual-try-on' },
  { key: 'trip', label: 'Trip Plan', icon: Plane, route: '/trip-planner' },
  { key: 'add', label: 'Add Piece', icon: Camera, route: null },
] as const;



export default function CommunityScreen() {
  const Colors = useThemeColors();
  const [activeView, setActiveView] = useState<SubView>('explore');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddMenu, setShowAddMenu] = useState(false);
  const addMenuY = useRef(new Animated.Value(0)).current;
  const addMenuOpacity = useRef(new Animated.Value(0)).current;

  const switchView = (view: SubView) => {
    Haptics.selectionAsync();
    setActiveView(view);
  };

  const pickFromGallery = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      router.push({ pathname: '/analyze', params: { imageUri: result.assets[0].uri } } as Href);
    }
  }, []);

  const pickFromCamera = useCallback(async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      router.push({ pathname: '/analyze', params: { imageUri: result.assets[0].uri } } as Href);
    }
  }, []);

  const openAddMenu = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowAddMenu(true);
    Animated.parallel([
      Animated.spring(addMenuY, { toValue: 1, useNativeDriver: true, tension: 80, friction: 10 }),
      Animated.timing(addMenuOpacity, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
  }, [addMenuY, addMenuOpacity]);

  const closeAddMenu = useCallback(() => {
    Animated.parallel([
      Animated.timing(addMenuY, { toValue: 0, duration: 120, useNativeDriver: true }),
      Animated.timing(addMenuOpacity, { toValue: 0, duration: 120, useNativeDriver: true }),
    ]).start(() => setShowAddMenu(false));
  }, [addMenuY, addMenuOpacity]);

  const handleShortcutPress = (shortcut: (typeof SHORTCUTS)[number]) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (shortcut.route) {
      router.push(shortcut.route as Href);
    } else if (shortcut.key === 'add') {
      openAddMenu();
    }
  };

  const styles = useMemo(() => createIndexStyles(Colors), [Colors]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {activeView === 'explore' ? 'Explore' : 'Discover'}
        </Text>
        <View style={styles.toggleRow}>
          <Pressable onPress={() => switchView('explore')}>
            <Text style={[styles.toggleText, activeView === 'explore' && styles.toggleTextActive]}>
              Explore
            </Text>
          </Pressable>
          <Pressable onPress={() => switchView('discover')}>
            <Text style={[styles.toggleText, activeView === 'discover' && styles.toggleTextActive]}>
              Discover
            </Text>
          </Pressable>
        </View>
      </View>

      {activeView === 'explore' ? (
        <ExploreView />
      ) : (
        <DiscoverView
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onShortcutPress={handleShortcutPress}
        />
      )}

      {/* Add Piece popover */}
      {showAddMenu && (
        <Pressable style={styles.popoverOverlay} onPress={closeAddMenu}>
          <Animated.View
            style={[
              styles.addPopover,
              {
                opacity: addMenuOpacity,
                transform: [{ translateY: addMenuY.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
              },
            ]}
          >
            <Pressable
              style={styles.addPopoverItem}
              onPress={() => { closeAddMenu(); pickFromCamera(); }}
            >
              <Camera size={18} color={Colors.textPrimary} />
              <Text style={styles.addPopoverText}>Take Photo</Text>
            </Pressable>
            <View style={styles.addPopoverDivider} />
            <Pressable
              style={styles.addPopoverItem}
              onPress={() => { closeAddMenu(); pickFromGallery(); }}
            >
              <ImageIcon size={18} color={Colors.textPrimary} />
              <Text style={styles.addPopoverText}>From Gallery</Text>
            </Pressable>
          </Animated.View>
        </Pressable>
      )}
    </SafeAreaView>
  );
}

function ExploreView() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createIndexStyles(Colors), [Colors]);
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
      <View style={styles.masonry}>
        <View style={styles.column}>
          {EXPLORE_PHOTOS_LEFT.map((photo) => (
            <Pressable key={photo.id} style={[styles.masonryTile, { height: photo.height }]}>
              <Image
                source={{ uri: photo.imageUrl }}
                style={styles.masonryImage}
                contentFit="cover"
              />
            </Pressable>
          ))}
        </View>
        <View style={styles.column}>
          {EXPLORE_PHOTOS_RIGHT.map((photo) => (
            <Pressable key={photo.id} style={[styles.masonryTile, { height: photo.height }]}>
              <Image
                source={{ uri: photo.imageUrl }}
                style={styles.masonryImage}
                contentFit="cover"
              />
            </Pressable>
          ))}
        </View>
      </View>
    </ScrollView>
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
  const Colors = useThemeColors();
  const styles = useMemo(() => createIndexStyles(Colors), [Colors]);
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

      {/* My closet */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>My Closet</Text>
      </View>

      <MyClosetProfileCard />
    </ScrollView>
  );
}

function MyClosetProfileCard() {
  const Colors = useThemeColors();
  const { items, digitalTwin } = useClosetStore();
  const { session } = useAuth();

  const styles = useMemo(() => createIndexStyles(Colors), [Colors]);

  const displayName = useMemo(() => {
    const email = session?.user?.email;
    if (!email) return 'You';
    return email.split('@')[0];
  }, [session]);

  const recentItems = useMemo(() => items.slice(0, 8), [items]);

  if (items.length === 0) {
    return (
      <View style={styles.profileCard}>
        <View style={styles.emptyClosetCard}>
          <Text style={styles.emptyClosetText}>Your closet is empty</Text>
          <Text style={styles.emptyClosetSub}>Add pieces to see them here</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.profileCard}>
      {/* Items row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.profileItemsRow}
      >
        {recentItems.map((item) => (
          <Pressable
            key={item.id}
            style={styles.profileItemThumb}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push({ pathname: '/item/[id]', params: { id: item.id } } as Href);
            }}
          >
            <Image
              source={{ uri: item.clean_image_url || item.image_url }}
              style={styles.profileItemImage}
              contentFit="contain"
            />
          </Pressable>
        ))}
      </ScrollView>

      {/* User info row */}
      <View style={styles.profileInfoRow}>
        <View style={styles.profileLeft}>
          {digitalTwin?.twin_image_url ? (
            <Image
              source={{ uri: digitalTwin.twin_image_url }}
              style={styles.profileAvatarImage}
              contentFit="cover"
            />
          ) : (
            <View style={[styles.profileAvatar, { backgroundColor: Colors.accentGreen }]}>
              <Text style={styles.profileAvatarText}>{displayName[0]?.toUpperCase()}</Text>
            </View>
          )}
          <View style={styles.profileMeta}>
            <Text style={styles.profileName}>{displayName}</Text>
            <Text style={styles.profileHandle}>
              {items.length} pieces
            </Text>
          </View>
        </View>
        <Pressable
          style={styles.profileViewBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/(tabs)/closet' as Href);
          }}
        >
          <Text style={styles.profileViewText}>View All</Text>
        </Pressable>
      </View>
    </View>
  );
}

function createIndexStyles(C: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, height: 52 },
    headerTitle: { fontFamily: Typography.serifFamilyBold, fontSize: 22, color: C.textPrimary },
    toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    toggleText: { fontFamily: Typography.bodyFamilyMedium, fontSize: 14, color: C.textTertiary },
    toggleTextActive: { fontFamily: Typography.bodyFamilyBold, color: C.textPrimary },
    listContent: { paddingBottom: 120 },
    masonry: { flexDirection: 'row', paddingHorizontal: 12, gap: 8, marginTop: 4 },
    column: { flex: 1, gap: 8 },
    masonryTile: { borderRadius: 16, overflow: 'hidden', backgroundColor: C.cardSurfaceAlt },
    masonryImage: { width: '100%', height: '100%' },
    searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.cardSurfaceAlt, borderRadius: Radius.input, marginHorizontal: 16, paddingHorizontal: 14, paddingVertical: 12, gap: 10, borderWidth: 1, borderColor: C.border },
    searchInput: { flex: 1, fontFamily: Typography.bodyFamily, fontSize: 15, color: C.textPrimary, padding: 0 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingTop: 20, paddingBottom: 12 },
    sectionTitle: { fontFamily: Typography.bodyFamilyBold, fontSize: 16, color: C.textPrimary },
    shortcutsRow: { paddingHorizontal: 16, gap: 16 },
    shortcutItem: { alignItems: 'center', gap: 6, width: 64 },
    shortcutCircle: { width: 52, height: 52, borderRadius: 26, backgroundColor: C.cardSurfaceAlt, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
    shortcutLabel: { fontFamily: Typography.bodyFamily, fontSize: 11, color: C.textSecondary, textAlign: 'center' },
    profileCard: { marginHorizontal: 16, marginBottom: 20, gap: 10 },
    profileItemsRow: { gap: 8 },
    profileItemThumb: { width: 85, height: 85, borderRadius: 12, overflow: 'hidden', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: C.border },
    profileItemImage: { width: '100%', height: '100%' },
    profileInfoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    profileLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
    profileAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center' as const, justifyContent: 'center' as const },
    profileAvatarImage: { width: 36, height: 36, borderRadius: 18 },
    profileAvatarText: { fontFamily: Typography.bodyFamilyBold, fontSize: 14, color: '#FFFFFF' },
    profileMeta: { gap: 2, flex: 1 },
    profileName: { fontFamily: Typography.bodyFamilyBold, fontSize: 14, color: C.textPrimary },
    profileHandle: { fontFamily: Typography.bodyFamily, fontSize: 11, color: C.textSecondary },
    profileViewBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: Radius.pill, backgroundColor: C.cardSurfaceAlt, borderWidth: 1, borderColor: C.border },
    profileViewText: { fontFamily: Typography.bodyFamilyBold, fontSize: 12, color: C.textPrimary },
    popoverOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 100 },
    addPopover: { position: 'absolute', bottom: 120, left: '50%', marginLeft: -80, width: 160, backgroundColor: C.cardSurface, borderRadius: Radius.lg, borderWidth: 1, borderColor: C.border, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 },
    addPopoverItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
    addPopoverText: { fontFamily: Typography.bodyFamilyMedium, fontSize: 14, color: C.textPrimary },
    addPopoverDivider: { height: 1, backgroundColor: C.border, marginHorizontal: 12 },
    emptyClosetCard: { padding: 32, alignItems: 'center' as const, backgroundColor: C.cardSurfaceAlt, borderRadius: Radius.lg, borderWidth: 1, borderColor: C.border },
    emptyClosetText: { fontFamily: Typography.bodyFamilyBold, fontSize: 16, color: C.textPrimary, marginBottom: 4 },
    emptyClosetSub: { fontFamily: Typography.bodyFamily, fontSize: 13, color: C.textSecondary },
  });
}
