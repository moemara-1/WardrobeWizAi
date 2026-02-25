import { Radius, Typography } from '@/constants/Colors';
import { useThemeColors } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { useClosetStore } from '@/stores/closetStore';
import { SocialPost, useSocialStore } from '@/stores/socialStore';
import { ClosetItem } from '@/types';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { Href, router, useLocalSearchParams } from 'expo-router';
import {
    ArrowLeft,
    ChevronRight,
    DollarSign,
    Grid3X3,
    ImageIcon as ImageIconLucide,
    Layers,
    User,
    UserCheck,
    UserCircle,
    UserPlus
} from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_COLUMNS = 3;
const GRID_GAP = 2;
const TILE_SIZE = (SCREEN_WIDTH - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS;

type ProfileTab = 'posts' | 'closet' | 'looks';

export default function UserProfileScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const Colors = useThemeColors();
    const styles = useMemo(() => createStyles(Colors), [Colors]);

    const currentUserId = useClosetStore((s) => s.userId);
    const following = useSocialStore((s) => s.following);
    const toggleFollow = useSocialStore((s) => s.toggleFollow);

    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<{ username: string; avatar_url: string | null; bio: string | null } | null>(null);
    const [items, setItems] = useState<ClosetItem[]>([]);
    const [posts, setPosts] = useState<SocialPost[]>([]);
    const [outfits, setOutfits] = useState<any[]>([]);
    const [followerCount, setFollowerCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);
    const [wardrobeValue, setWardrobeValue] = useState(0);
    const [activeTab, setActiveTab] = useState<ProfileTab>('posts');
    const [activeMessage, setActiveMessage] = useState('');

    const isMe = id === currentUserId;
    const isFollowing = following.some((f) => f.userId === id);

    // Fetch user's follower and following counts
    useEffect(() => {
        if (!id || isMe) return;
        
        let cancelled = false;
        (async () => {
            try {
                // Get follower count
                const { count: followersCount } = await supabase
                    .from('follows')
                    .select('*', { count: 'exact', head: true })
                    .eq('following_id', id);
                
                // Get following count
                const { count: followingCnt } = await supabase
                    .from('follows')
                    .select('*', { count: 'exact', head: true })
                    .eq('follower_id', id);
                
                if (!cancelled) {
                    setFollowerCount(followersCount || 0);
                    setFollowingCount(followingCnt || 0);
                }
            } catch (e) {
                console.warn('Failed to fetch follower counts', e);
            }
        })();
        
        return () => { cancelled = true; };
    }, [id, isMe]);

    useEffect(() => {
        if (isMe) {
            router.replace('/(tabs)/profile' as Href);
            return;
        }

        let cancelled = false;
        (async () => {
            try {
                const { data: prof } = await supabase.from('profiles').select('*').eq('id', id).single();
                if (cancelled || !prof) return;

                let avatar = prof.avatar_url;
                if (!avatar) {
                    const { data: twin } = await supabase.from('digital_twins').select('selfie_url').eq('user_id', id).single();
                    avatar = twin?.selfie_url;
                }

                setProfile({
                    username: prof.display_name || prof.username || `user_${id.slice(0, 6)}`,
                    avatar_url: avatar || null,
                    bio: prof.bio || null,
                });

                const { data: userItems } = await supabase
                    .from('items')
                    .select('*')
                    .eq('user_id', id)
                    .order('created_at', { ascending: false });

                if (userItems) {
                    setItems(userItems.map(row => ({
                        id: row.id,
                        user_id: row.user_id,
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
                    })));

                    const totalValue = (userItems || []).reduce((sum: number, item: any) => {
                        return sum + (item.estimated_value ? Number(item.estimated_value) : 0);
                    }, 0);
                    setWardrobeValue(totalValue);
                }
                
                // Fetch user's outfits
                const { data: userOutfits } = await supabase
                    .from('outfits')
                    .select('*')
                    .eq('user_id', id)
                    .order('created_at', { ascending: false });

                if (userOutfits) {
                    setOutfits(userOutfits);
                }

                // Fetch user's public posts
                const { data: userPosts } = await supabase
                    .from('posts')
                    .select('*')
                    .eq('user_id', id)
                    .order('created_at', { ascending: false });

                if (userPosts) {
                    const formattedPosts: SocialPost[] = userPosts.map((row: any) => ({
                        id: row.id,
                        userId: row.user_id,
                        username: profile?.username || '',
                        avatarUrl: profile?.avatar_url || null,
                        imageUrl: row.image_url,
                        caption: row.caption || '',
                        clothingPieces: [],
                        likes: row.likes_count || 0,
                        liked: false,
                        comments: [],
                        createdAt: row.created_at,
                    }));
                    setPosts(formattedPosts);
                }
            } catch (e) {
                console.warn('Failed to load user profile', e);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [id, isMe]);

    const handleFollowToggle = () => {
        if (!profile) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        
        if (isFollowing) {
            setActiveMessage('Unfollowed');
        } else {
            setActiveMessage('Following');
        }
        
        toggleFollow({ userId: id, username: profile.username, avatarUrl: profile.avatar_url });
        
        // Clear message after delay
        setTimeout(() => setActiveMessage(''), 2000);
    };

    // Grid data based on active tab
    const gridData = activeTab === 'closet' ? items
        : activeTab === 'looks' ? outfits
            : activeTab === 'posts' ? posts
                : [];

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <FlatList
                data={gridData}
                keyExtractor={(item: any) => item.id}
                numColumns={activeTab === 'looks' ? 1 : GRID_COLUMNS}
                key={activeTab}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.gridContent}
                columnWrapperStyle={activeTab !== 'looks' ? styles.gridRow : undefined}
                ListHeaderComponent={
                    <>
                        <View style={styles.header}>
                            <Pressable style={styles.backBtn} onPress={() => router.back()}>
                                <ArrowLeft size={20} color={Colors.textPrimary} />
                            </Pressable>
                            <Text style={styles.headerTitle}>{profile?.username || 'Profile'}</Text>
                            <View style={styles.headerSpacer} />
                        </View>

                        {activeMessage ? (
                            <View style={styles.messageBanner}>
                                <Text style={styles.messageText}>{activeMessage}</Text>
                            </View>
                        ) : null}

                        {loading ? (
                            <View style={styles.emptyContainer}>
                                <ActivityIndicator size="large" color={Colors.textSecondary} />
                            </View>
                        ) : !profile ? (
                            <View style={styles.emptyContainer}>
                                <Text style={styles.emptyText}>User not found</Text>
                            </View>
                        ) : (
                            <>
                                <View style={styles.profileTop}>
                                    {profile.avatar_url ? (
                                        <Image source={{ uri: profile.avatar_url }} style={styles.avatarLarge} contentFit="cover" />
                                    ) : (
                                        <View style={styles.avatarPlaceholderLarge}>
                                            <User size={40} color={Colors.textTertiary} />
                                        </View>
                                    )}

                                    <View style={styles.profileInfo}>
                                        <Text style={styles.profileName}>{profile.username}</Text>
                                        <Text style={styles.profileHandle}>@{profile.username.toLowerCase().replace(/\s+/g, '')}</Text>
                                        {profile.bio && <Text style={styles.profileBio}>{profile.bio}</Text>}
                                    </View>

                                    <View style={styles.actionButtons}>
                                        <Pressable
                                            style={[styles.followBtn, isFollowing && styles.followBtnActive]}
                                            onPress={handleFollowToggle}
                                        >
                                            {isFollowing ? (
                                                <>
                                                    <UserCheck size={16} color={Colors.textPrimary} />
                                                    <Text style={styles.followBtnTextActive}>Following</Text>
                                                </>
                                            ) : (
                                                <>
                                                    <UserPlus size={16} color={Colors.background} />
                                                    <Text style={styles.followBtnText}>Follow</Text>
                                                </>
                                            )}
                                        </Pressable>
                                    </View>
                                </View>

                                <View style={styles.statsRow}>
                                    <View style={styles.statBlock}>
                                        <Text style={styles.statValue}>{posts.length}</Text>
                                        <Text style={styles.statLabel}>Posts</Text>
                                    </View>
                                    <View style={styles.statDivider} />
                                    <View style={styles.statBlock}>
                                        <Text style={styles.statValue}>{followerCount}</Text>
                                        <Text style={styles.statLabel}>Followers</Text>
                                    </View>
                                    <View style={styles.statDivider} />
                                    <View style={styles.statBlock}>
                                        <Text style={styles.statValue}>{followingCount}</Text>
                                        <Text style={styles.statLabel}>Following</Text>
                                    </View>
                                    <View style={styles.statDivider} />
                                    <View style={styles.statBlock}>
                                        <Text style={styles.statValue}>{items.length}</Text>
                                        <Text style={styles.statLabel}>Pieces</Text>
                                    </View>
                                </View>

                                {/* Wardrobe Value Card */}
                                <Pressable
                                    style={styles.neckworthCard}
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        router.push('/closet-value' as Href);
                                    }}
                                >
                                    <View style={styles.neckworthIcon}>
                                        <DollarSign size={18} color={Colors.accentGreen} />
                                    </View>
                                    <View style={styles.neckworthMeta}>
                                        <Text style={styles.neckworthTitle}>Wardrobe Value</Text>
                                        <Text style={styles.neckworthSub}>${wardrobeValue.toLocaleString()} total value</Text>
                                    </View>
                                    <ChevronRight size={18} color={Colors.textTertiary} />
                                </Pressable>

                                <View style={styles.tabBar}>
                                    {([
                                        { key: 'posts' as ProfileTab, Icon: ImageIconLucide },
                                        { key: 'closet' as ProfileTab, Icon: Grid3X3 },
                                        { key: 'looks' as ProfileTab, Icon: Layers },
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
                        )}
                    </>
                }
                renderItem={({ item }: { item: any }) => {
                    if (activeTab === 'posts') {
                        return (
                            <Pressable
                                style={styles.gridTile}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    router.push(`/post/${item.id}` as any);
                                }}
                            >
                                <Image
                                    source={{ uri: item.imageUrl || item.image_url }}
                                    style={styles.gridImage}
                                    contentFit="cover"
                                />
                            </Pressable>
                        );
                    }
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
                    const resolvedPieces = (item.item_ids || [])
                        .map((itemId: string) => items.find((i) => i.id === itemId))
                        .filter(Boolean);
                    return (
                        <View style={styles.outfitCard}>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.outfitItems}>
                                {resolvedPieces.map((oi: any) => (
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
                                <Text style={styles.outfitName}>{item.name || 'Outfit'}</Text>
                                <Text style={styles.outfitCount}>{resolvedPieces.length} pieces</Text>
                            </View>
                        </View>
                    );
                }}
                ListEmptyComponent={
                    <View style={styles.emptyGrid}>
                        <Text style={styles.emptyGridText}>
                            {activeTab === 'posts'
                                ? 'No posts yet'
                                : activeTab === 'closet'
                                    ? 'No pieces in closet yet'
                                    : 'No outfits saved yet'}
                        </Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}

function createStyles(Colors: any) {
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: Colors.background },
        header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
        backBtn: { padding: 8, marginLeft: -8 },
        headerTitle: { flex: 1, textAlign: 'center', fontFamily: Typography.serifFamilyBold, fontSize: 18, color: Colors.textPrimary },
        headerSpacer: { width: 36 },
        messageBanner: { backgroundColor: Colors.accentGreen, paddingVertical: 8, paddingHorizontal: 16, alignItems: 'center' },
        messageText: { color: '#FFF', fontFamily: Typography.bodyFamilyBold, fontSize: 14 },
        emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
        emptyText: { fontFamily: Typography.bodyFamily, fontSize: 15, color: Colors.textSecondary },
        gridContent: { paddingBottom: 40 },
        gridRow: { paddingHorizontal: GRID_GAP, gap: GRID_GAP },
        profileTop: { padding: 24, alignItems: 'center' },
        avatarLarge: { width: 100, height: 100, borderRadius: 50 },
        avatarPlaceholderLarge: { width: 100, height: 100, borderRadius: 50, backgroundColor: Colors.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
        profileInfo: { alignItems: 'center', marginTop: 16, marginBottom: 16 },
        profileName: { fontFamily: Typography.serifFamilyBold, fontSize: 24, color: Colors.textPrimary, marginBottom: 2 },
        profileHandle: { fontFamily: Typography.bodyFamily, fontSize: 14, color: Colors.textSecondary, marginBottom: 8 },
        profileBio: { fontFamily: Typography.bodyFamily, fontSize: 15, color: Colors.textSecondary, textAlign: 'center', paddingHorizontal: 32 },
        actionButtons: { flexDirection: 'row', gap: 12, marginBottom: 8 },
        followBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.accentGreen, paddingVertical: 10, paddingHorizontal: 40, borderRadius: Radius.pill, gap: 8, minWidth: 160 },
        followBtnActive: { backgroundColor: Colors.cardSurfaceAlt, borderWidth: 1, borderColor: Colors.border },
        followBtnText: { fontFamily: Typography.bodyFamilyBold, fontSize: 15, color: Colors.background },
        followBtnTextActive: { fontFamily: Typography.bodyFamilyBold, fontSize: 15, color: Colors.textPrimary },
        statsRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 16, paddingHorizontal: 24, borderBottomWidth: 1, borderBottomColor: Colors.border, marginBottom: 16 },
        statBlock: { alignItems: 'center' },
        statValue: { fontFamily: Typography.serifFamilyBold, fontSize: 18, color: Colors.textPrimary },
        statLabel: { fontFamily: Typography.bodyFamily, fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
        statDivider: { width: 1, backgroundColor: Colors.border },
        neckworthCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, marginHorizontal: 16, marginVertical: 8, padding: 16, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border },
        neckworthIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.accentGreen + '20', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
        neckworthMeta: { flex: 1 },
        neckworthTitle: { fontFamily: Typography.bodyFamilyBold, fontSize: 15, color: Colors.textPrimary },
        neckworthSub: { fontFamily: Typography.bodyFamily, fontSize: 12, color: Colors.textSecondary },
        twinSection: { marginTop: 8 },
        twinCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, marginHorizontal: 16, marginVertical: 8, padding: 16, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border },
        twinCardAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
        twinCardMeta: { flex: 1 },
        twinCardTitle: { fontFamily: Typography.bodyFamilyBold, fontSize: 15, color: Colors.textPrimary },
        twinCardSub: { fontFamily: Typography.bodyFamily, fontSize: 12, color: Colors.textSecondary },
        tabBar: { flexDirection: 'row', justifyContent: 'space-around', borderBottomWidth: 1, borderBottomColor: Colors.border, paddingVertical: 12, marginTop: 8 },
        tabItem: { paddingVertical: 8, paddingHorizontal: 40 },
        tabItemActive: { borderBottomWidth: 2, borderBottomColor: Colors.textPrimary },
        gridTile: { flex: 1, aspectRatio: 1, maxWidth: TILE_SIZE, backgroundColor: Colors.surface, margin: GRID_GAP / 2, borderRadius: 2, overflow: 'hidden' },
        gridImage: { width: '100%', height: '100%' },
        outfitCard: { backgroundColor: Colors.surface, marginHorizontal: 16, marginVertical: 8, borderRadius: Radius.md, overflow: 'hidden', padding: 12 },
        outfitItems: { paddingVertical: 8, gap: 8 },
        outfitThumb: { width: 60, height: 60, borderRadius: Radius.sm, overflow: 'hidden', marginRight: 8 },
        outfitThumbImage: { width: '100%', height: '100%' },
        outfitInfo: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.border },
        outfitName: { fontFamily: Typography.bodyFamilyBold, fontSize: 14, color: Colors.textPrimary },
        outfitCount: { fontFamily: Typography.bodyFamily, fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
        emptyGrid: { paddingVertical: 60, alignItems: 'center' },
        emptyGridText: { fontFamily: Typography.bodyFamily, fontSize: 14, color: Colors.textSecondary },
    });
}
