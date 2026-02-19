import { supabase } from '@/lib/supabase';
import { ClothingCategory } from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface SocialPost {
    id: string;
    userId: string;
    username: string;
    avatarUrl: string | null;
    imageUrl: string;
    caption: string;
    clothingPieces: PostClothingPiece[];
    likes: number;
    liked: boolean;
    comments: PostComment[];
    createdAt: string;
}

export interface PostClothingPiece {
    name: string;
    brand: string | null;
    category: ClothingCategory;
    imageUrl: string | null;
}

export interface PostComment {
    id: string;
    userId: string;
    username: string;
    avatarUrl: string | null;
    text: string;
    createdAt: string;
}

export interface UserFollow {
    userId: string;
    username: string;
    avatarUrl: string | null;
}

interface SocialState {
    posts: SocialPost[];
    userPosts: SocialPost[];
    likedPosts: SocialPost[];
    followers: UserFollow[];
    following: UserFollow[];

    currentUser: {
        username: string;
        avatarUrl: string | null;
        bio: string | null;
    };

    addPost: (post: SocialPost) => void;
    deletePost: (id: string) => void;
    likePost: (id: string) => void;
    addComment: (postId: string, comment: PostComment) => void;
    toggleFollow: (user: UserFollow) => void;
    updateProfile: (updates: Partial<{ username: string; avatarUrl: string | null; bio: string | null }>) => void;
    fetchLikedPosts: (userId: string) => Promise<void>;
    fetchFollowers: (userId: string) => Promise<void>;
    fetchFollowing: (userId: string) => Promise<void>;
    hydrateSocial: (userId: string) => Promise<void>;
    setLikedPosts: (posts: SocialPost[]) => void;
    setFollowers: (followers: UserFollow[]) => void;
    setFollowing: (following: UserFollow[]) => void;
}

const SEED_POSTS: SocialPost[] = [
    {
        id: 'post-1',
        userId: 'user-alex',
        username: 'alexstyle',
        avatarUrl: null,
        imageUrl: 'https://images.unsplash.com/photo-1608635680046-aebf91c1a9c8?w=600',
        caption: 'Fall layers done right 🍂',
        clothingPieces: [
            { name: 'Oversized Wool Coat', brand: 'COS', category: 'outerwear', imageUrl: null },
            { name: 'Cashmere Turtleneck', brand: 'Uniqlo', category: 'top', imageUrl: null },
            { name: 'Wide Leg Trousers', brand: 'Zara', category: 'bottom', imageUrl: null },
        ],
        likes: 42,
        liked: false,
        comments: [
            { id: 'c1', userId: 'user-maya', username: 'mayafits', avatarUrl: null, text: 'Love the coat!', createdAt: '2026-02-10T10:00:00Z' },
        ],
        createdAt: '2026-02-10T09:00:00Z',
    },
    {
        id: 'post-2',
        userId: 'user-jordan',
        username: 'jordanwears',
        avatarUrl: null,
        imageUrl: 'https://images.unsplash.com/photo-1622021211530-7d31fd86862d?w=600',
        caption: 'Minimal streetwear vibes',
        clothingPieces: [
            { name: 'Air Force 1 Low', brand: 'Nike', category: 'shoe', imageUrl: null },
            { name: 'Cargo Pants', brand: 'Carhartt WIP', category: 'bottom', imageUrl: null },
            { name: 'Oversized Graphic Tee', brand: null, category: 'top', imageUrl: null },
        ],
        likes: 89,
        liked: false,
        comments: [],
        createdAt: '2026-02-09T15:30:00Z',
    },
    {
        id: 'post-3',
        userId: 'user-sam',
        username: 'samcloset',
        avatarUrl: null,
        imageUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600',
        caption: 'Date night outfit check',
        clothingPieces: [
            { name: 'Silk Midi Dress', brand: 'Reformation', category: 'dress', imageUrl: null },
            { name: 'Strappy Heels', brand: 'Steve Madden', category: 'shoe', imageUrl: null },
            { name: 'Gold Chain Necklace', brand: null, category: 'jewelry', imageUrl: null },
        ],
        likes: 156,
        liked: false,
        comments: [
            { id: 'c2', userId: 'user-alex', username: 'alexstyle', avatarUrl: null, text: 'Where is this dress from??', createdAt: '2026-02-09T16:00:00Z' },
            { id: 'c3', userId: 'user-sam', username: 'samcloset', avatarUrl: null, text: '@alexstyle Reformation!', createdAt: '2026-02-09T16:05:00Z' },
        ],
        createdAt: '2026-02-09T14:00:00Z',
    },
    {
        id: 'post-4',
        userId: 'user-maya',
        username: 'mayafits',
        avatarUrl: null,
        imageUrl: 'https://images.unsplash.com/photo-1576507169637-cdcff61eb6d5?w=600',
        caption: 'Gym to brunch transition 💪',
        clothingPieces: [
            { name: 'Track Jacket', brand: 'Adidas', category: 'outerwear', imageUrl: null },
            { name: 'Leggings', brand: 'Lululemon', category: 'bottom', imageUrl: null },
            { name: 'Samba OG', brand: 'Adidas', category: 'shoe', imageUrl: null },
        ],
        likes: 67,
        liked: false,
        comments: [],
        createdAt: '2026-02-08T12:00:00Z',
    },
    {
        id: 'post-5',
        userId: 'user-kai',
        username: 'kaidrip',
        avatarUrl: null,
        imageUrl: 'https://images.unsplash.com/photo-1683488780206-88ce4240f3da?w=600',
        caption: 'Vintage finds of the week',
        clothingPieces: [
            { name: 'Vintage Denim Jacket', brand: "Levi's", category: 'outerwear', imageUrl: null },
            { name: 'Band Tee', brand: null, category: 'top', imageUrl: null },
            { name: 'Straight Jeans', brand: "Levi's", category: 'bottom', imageUrl: null },
        ],
        likes: 203,
        liked: false,
        comments: [
            { id: 'c4', userId: 'user-jordan', username: 'jordanwears', avatarUrl: null, text: 'That jacket is insane', createdAt: '2026-02-08T10:00:00Z' },
        ],
        createdAt: '2026-02-08T09:00:00Z',
    },
    {
        id: 'post-6',
        userId: 'user-nina',
        username: 'ninaootd',
        avatarUrl: null,
        imageUrl: 'https://images.unsplash.com/photo-1612694831097-d7cd14379928?w=600',
        caption: 'Cozy Sunday layers',
        clothingPieces: [
            { name: 'Chunky Knit Sweater', brand: 'H&M', category: 'top', imageUrl: null },
            { name: 'Wool Scarf', brand: 'Acne Studios', category: 'accessory', imageUrl: null },
        ],
        likes: 34,
        liked: false,
        comments: [],
        createdAt: '2026-02-07T11:00:00Z',
    },
];

const SEED_FOLLOWERS: UserFollow[] = [
    { userId: 'user-alex', username: 'alexstyle', avatarUrl: null },
    { userId: 'user-maya', username: 'mayafits', avatarUrl: null },
    { userId: 'user-kai', username: 'kaidrip', avatarUrl: null },
];

const SEED_FOLLOWING: UserFollow[] = [
    { userId: 'user-jordan', username: 'jordanwears', avatarUrl: null },
    { userId: 'user-sam', username: 'samcloset', avatarUrl: null },
    { userId: 'user-nina', username: 'ninaootd', avatarUrl: null },
    { userId: 'user-kai', username: 'kaidrip', avatarUrl: null },
];

const syncSocial = {
    async likePost(postId: string, userId: string, liked: boolean) {
        try {
            if (liked) {
                await supabase.from('likes').insert({ post_id: postId, user_id: userId });
            } else {
                await supabase.from('likes').delete().match({ post_id: postId, user_id: userId });
            }
        } catch (e) {
            if (__DEV__) console.warn('syncSocial.likePost failed:', e);
        }
    },
    async addComment(postId: string, comment: PostComment) {
        try {
            await supabase.from('comments').insert({
                id: comment.id,
                post_id: postId,
                user_id: comment.userId,
                username: comment.username,
                text: comment.text,
                created_at: comment.createdAt,
            });
        } catch (e) {
            if (__DEV__) console.warn('syncSocial.addComment failed:', e);
        }
    },
    async toggleFollow(targetUserId: string, currentUserId: string, follow: boolean) {
        try {
            if (follow) {
                await supabase.from('follows').insert({ follower_id: currentUserId, following_id: targetUserId });
            } else {
                await supabase.from('follows').delete().match({ follower_id: currentUserId, following_id: targetUserId });
            }
        } catch (e) {
            if (__DEV__) console.warn('syncSocial.toggleFollow failed:', e);
        }
    },
};

export const useSocialStore = create<SocialState>()(
    persist(
        (set, get) => ({
            posts: SEED_POSTS,
            userPosts: [],
            likedPosts: [],
            followers: SEED_FOLLOWERS,
            following: SEED_FOLLOWING,
            currentUser: {
                username: 'User',
                avatarUrl: null,
                bio: 'Fashion enthusiast | WardrobeWiz user',
            },

            addPost: (post) => set((state) => ({
                posts: [post, ...state.posts],
                userPosts: [post, ...state.userPosts],
            })),

            deletePost: (id) => set((state) => ({
                posts: state.posts.filter((p) => p.id !== id),
                userPosts: state.userPosts.filter((p) => p.id !== id),
            })),

            likePost: (id) => {
                const state = get();
                const post = state.posts.find((p) => p.id === id);
                if (!post) return;
                const nowLiked = !post.liked;

                set((s) => {
                    const updatedPosts = s.posts.map((p) =>
                        p.id === id
                            ? { ...p, liked: nowLiked, likes: nowLiked ? p.likes + 1 : p.likes - 1 }
                            : p
                    );
                    const updatedPost = updatedPosts.find((p) => p.id === id)!;
                    return {
                        posts: updatedPosts,
                        likedPosts: nowLiked
                            ? [updatedPost, ...s.likedPosts.filter((p) => p.id !== id)]
                            : s.likedPosts.filter((p) => p.id !== id),
                    };
                });

                syncSocial.likePost(id, 'current-user', nowLiked);
            },

            addComment: (postId, comment) => {
                set((state) => ({
                    posts: state.posts.map((p) =>
                        p.id === postId
                            ? { ...p, comments: [...p.comments, comment] }
                            : p
                    ),
                }));
                syncSocial.addComment(postId, comment);
            },

            toggleFollow: (user) => {
                const state = get();
                const isFollowing = state.following.some((f) => f.userId === user.userId);
                set({
                    following: isFollowing
                        ? state.following.filter((f) => f.userId !== user.userId)
                        : [...state.following, user],
                });
                syncSocial.toggleFollow(user.userId, 'current-user', !isFollowing);
            },

            updateProfile: (updates) => set((state) => ({
                currentUser: { ...state.currentUser, ...updates }
            })),

            setLikedPosts: (posts) => set({ likedPosts: posts }),
            setFollowers: (followers) => set({ followers }),
            setFollowing: (following) => set({ following }),

            fetchLikedPosts: async (userId: string) => {
                try {
                    const { data } = await supabase
                        .from('likes')
                        .select('post_id, posts(*)')
                        .eq('user_id', userId)
                        .order('created_at', { ascending: false });
                    if (data?.length) {
                        const posts: SocialPost[] = data
                            .filter((row: any) => row.posts)
                            .map((row: any) => ({
                                id: row.posts.id,
                                userId: row.posts.user_id,
                                username: row.posts.username || '',
                                avatarUrl: row.posts.avatar_url || null,
                                imageUrl: row.posts.image_url,
                                caption: row.posts.caption || '',
                                clothingPieces: [],
                                likes: row.posts.likes_count || 0,
                                liked: true,
                                comments: [],
                                createdAt: row.posts.created_at,
                            }));
                        set({ likedPosts: posts });
                    }
                } catch (e) {
                    if (__DEV__) console.warn('fetchLikedPosts failed:', e);
                }
            },

            fetchFollowers: async (userId: string) => {
                try {
                    const { data } = await supabase
                        .from('follows')
                        .select('follower_id, profiles!follows_follower_id_fkey(id, username, avatar_url)')
                        .eq('following_id', userId);
                    if (data?.length) {
                        const followers: UserFollow[] = data
                            .filter((row: any) => row.profiles)
                            .map((row: any) => ({
                                userId: row.profiles.id,
                                username: row.profiles.username || '',
                                avatarUrl: row.profiles.avatar_url || null,
                            }));
                        set({ followers });
                    }
                } catch (e) {
                    if (__DEV__) console.warn('fetchFollowers failed:', e);
                }
            },

            fetchFollowing: async (userId: string) => {
                try {
                    const { data } = await supabase
                        .from('follows')
                        .select('following_id, profiles!follows_following_id_fkey(id, username, avatar_url)')
                        .eq('follower_id', userId);
                    if (data?.length) {
                        const following: UserFollow[] = data
                            .filter((row: any) => row.profiles)
                            .map((row: any) => ({
                                userId: row.profiles.id,
                                username: row.profiles.username || '',
                                avatarUrl: row.profiles.avatar_url || null,
                            }));
                        set({ following });
                    }
                } catch (e) {
                    if (__DEV__) console.warn('fetchFollowing failed:', e);
                }
            },

            hydrateSocial: async (userId: string) => {
                const store = get();
                await Promise.all([
                    store.fetchLikedPosts(userId),
                    store.fetchFollowers(userId),
                    store.fetchFollowing(userId),
                ]);
            },
        }),
        {
            name: 'social-storage',
            version: 2,
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({
                userPosts: state.userPosts,
                likedPosts: state.likedPosts,
                followers: state.followers,
                following: state.following,
                currentUser: state.currentUser,
            }),
        },
    ),
);
