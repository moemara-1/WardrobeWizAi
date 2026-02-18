import { Radius, Typography } from '@/constants/Colors';
import { useThemeColors } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { useClosetStore } from '@/stores/closetStore';
import { ClosetItem } from '@/types';
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
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

interface ExplorePost {
  id: string;
  imageUrl: string;
  username: string;
  avatarUrl: string | null;
  height: number;
}

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

const MASONRY_HEIGHTS = [320, 260, 300, 240, 340, 280];

function ExploreView() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createIndexStyles(Colors), [Colors]);
  const [posts, setPosts] = useState<ExplorePost[]>([]);
  const [loading, setLoading] = useState(true);
  const localPosts = useClosetStore((s) => s.posts);
  const localProfile = useClosetStore((s) => s.userProfile);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: rows } = await supabase
          .from('posts')
          .select('id, user_id, image_url')
          .order('created_at', { ascending: false })
          .limit(20);

        if (!cancelled && rows?.length) {
          const userIds = [...new Set(rows.map(r => r.user_id as string))];
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, username, avatar_url')
            .in('id', userIds);

          const profileMap = new Map<string, { username: string; avatar_url?: string }>();
          profiles?.forEach(p => profileMap.set(p.id, { username: p.username, avatar_url: p.avatar_url }));

          const mapped: ExplorePost[] = rows.map((row, idx) => ({
            id: row.id,
            imageUrl: row.image_url,
            username: profileMap.get(row.user_id)?.username || 'user',
            avatarUrl: profileMap.get(row.user_id)?.avatar_url || null,
            height: MASONRY_HEIGHTS[idx % MASONRY_HEIGHTS.length],
          }));

          if (!cancelled) setPosts(mapped);
        }
      } catch {
        // silent fail — local posts will still show below
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const allPosts = useMemo(() => {
    const supabaseIds = new Set(posts.map(p => p.id));
    const localMapped: ExplorePost[] = localPosts
      .filter(p => !supabaseIds.has(p.id))
      .map((p, idx) => ({
        id: p.id,
        imageUrl: p.image_url,
        username: localProfile.username,
        avatarUrl: localProfile.pfp_url || null,
        height: MASONRY_HEIGHTS[(posts.length + idx) % MASONRY_HEIGHTS.length],
      }));
    return [...posts, ...localMapped];
  }, [posts, localPosts, localProfile]);

  const leftColumn = allPosts.filter((_, i) => i % 2 === 0);
  const rightColumn = allPosts.filter((_, i) => i % 2 === 1);

  if (loading && allPosts.length === 0) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontFamily: Typography.bodyFamily, fontSize: 14, color: Colors.textSecondary }}>Loading posts...</Text>
      </View>
    );
  }

  if (allPosts.length === 0) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
        <Text style={{ fontFamily: Typography.bodyFamilyBold, fontSize: 16, color: Colors.textPrimary, textAlign: 'center' }}>No posts yet</Text>
        <Text style={{ fontFamily: Typography.bodyFamily, fontSize: 13, color: Colors.textSecondary, textAlign: 'center', marginTop: 4 }}>Be the first to share an outfit!</Text>
      </View>
    );
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
      <View style={styles.masonry}>
        {[leftColumn, rightColumn].map((column, colIdx) => (
          <View key={colIdx} style={styles.column}>
            {column.map((post) => (
              <Pressable
                key={post.id}
                style={[styles.masonryTile, { height: post.height }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push({ pathname: '/post/[id]', params: { id: post.id } } as Href);
                }}
              >
                <Image source={{ uri: post.imageUrl }} style={styles.masonryImage} contentFit="cover" />
                <View style={styles.masonryOverlay}>
                  <Text style={styles.masonryUsername} numberOfLines={1}>@{post.username}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

interface CommunityUser {
  id: string;
  username: string;
  pfp_url?: string;
  items: ClosetItem[];
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
  const [communityUsers, setCommunityUsers] = useState<CommunityUser[]>([]);
  const [loadingCommunity, setLoadingCommunity] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Fetch all users who have items
        // We'll fetching items first, then profiles for those users
        const { data: itemRows } = await supabase
          .from('items')
          .select('id, user_id, name, category, brand, colors, image_url, clean_image_url, garment_type, tags, estimated_value, created_at, updated_at')
          .order('created_at', { ascending: false })
          .limit(100);

        if (cancelled || !itemRows?.length) {
          if (!cancelled) setLoadingCommunity(false);
          return;
        }

        // Group items by user_id
        const userItemsMap = new Map<string, ClosetItem[]>();
        for (const row of itemRows) {
          const uid = row.user_id as string;
          if (!userItemsMap.has(uid)) userItemsMap.set(uid, []);
          userItemsMap.get(uid)!.push({
            id: row.id,
            user_id: uid,
            name: row.name,
            category: row.category,
            brand: row.brand,
            colors: row.colors || [],
            image_url: row.image_url,
            clean_image_url: row.clean_image_url,
            garment_type: row.garment_type,
            tags: row.tags || [],
            estimated_value: row.estimated_value ? Number(row.estimated_value) : undefined,
            detected_confidence: 1,
            wear_count: 0,
            favorite: false,
            created_at: row.created_at,
            updated_at: row.updated_at || row.created_at,
          });
        }

        // Fetch profiles for these users
        const userIds = Array.from(userItemsMap.keys());
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', userIds);

        const profileMap = new Map<string, { username: string, avatar_url?: string }>();
        if (profiles) {
          profiles.forEach(p => {
            profileMap.set(p.id, { username: p.username, avatar_url: p.avatar_url });
          });
        }

        // Build community user list
        const users: CommunityUser[] = [];
        for (const [uid, items] of userItemsMap) {
          const profile = profileMap.get(uid);

          // Try to get twin info as fallback
          let twinUrl: string | undefined;
          if (!profile?.avatar_url) {
            const { data: twin } = await supabase
              .from('digital_twins')
              .select('twin_image_url, selfie_url')
              .eq('user_id', uid)
              .single();
            twinUrl = twin?.selfie_url || undefined;
          }

          users.push({
            id: uid,
            username: profile?.username || `user_${uid.slice(0, 6)}`,
            pfp_url: profile?.avatar_url || twinUrl,
            items,
          });
        }

        if (!cancelled) setCommunityUsers(users);
      } catch (e) {
        if (__DEV__) console.warn('Failed to load community:', e);
      } finally {
        if (!cancelled) setLoadingCommunity(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

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

      {/* Community */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Community</Text>
      </View>
      {loadingCommunity ? (
        <View style={styles.emptyClosetCard}>
          <Text style={styles.emptyClosetText}>Loading community...</Text>
        </View>
      ) : communityUsers.length === 0 ? (
        <View style={[styles.emptyClosetCard, { marginHorizontal: 16 }]}>
          <Text style={styles.emptyClosetText}>No community members yet</Text>
        </View>
      ) : (
        communityUsers.map((user) => (
          <CommunityUserCard key={user.id} user={user} />
        ))
      )}
    </ScrollView>
  );
}

function CommunityUserCard({ user }: { user: CommunityUser }) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createIndexStyles(Colors), [Colors]);

  return (
    <View style={styles.profileCard}>
      <View style={styles.profileInfoRow}>
        <View style={styles.profileLeft}>
          {user.pfp_url ? (
            <Image source={{ uri: user.pfp_url }} style={styles.profileAvatarImage} contentFit="cover" />
          ) : (
            <View style={[styles.profileAvatar, { backgroundColor: Colors.accentGreen }]}>
              <Text style={styles.profileAvatarText}>{user.username[0]?.toUpperCase()}</Text>
            </View>
          )}
          <View style={styles.profileMeta}>
            <Text style={styles.profileName}>{user.username}</Text>
            <Text style={styles.profileHandle}>{user.items.length} pieces</Text>
          </View>
        </View>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.profileItemsRow}
      >
        {user.items.slice(0, 8).map((item) => (
          <View key={item.id} style={styles.profileItemThumb}>
            <Image
              source={{ uri: item.clean_image_url || item.image_url }}
              style={styles.profileItemImage}
              contentFit="contain"
            />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function MyClosetProfileCard() {
  const Colors = useThemeColors();
  const { items, digitalTwin, userProfile } = useClosetStore();

  const styles = useMemo(() => createIndexStyles(Colors), [Colors]);

  const displayName = userProfile?.username || 'You';
  const pfpUrl = userProfile?.pfp_url;

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
          {pfpUrl ? (
            <Image
              source={{ uri: pfpUrl }}
              style={styles.profileAvatarImage}
              contentFit="cover"
            />
          ) : digitalTwin?.selfie_url ? (
            <Image
              source={{ uri: digitalTwin.selfie_url }}
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
    masonryOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 8, paddingVertical: 6, backgroundColor: 'rgba(0,0,0,0.35)', borderBottomLeftRadius: 16, borderBottomRightRadius: 16 },
    masonryUsername: { fontFamily: Typography.bodyFamilyMedium, fontSize: 11, color: '#FFFFFF' },
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
