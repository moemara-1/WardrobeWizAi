import { supabase } from '@/lib/supabase';
import { ClothingCategory } from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

async function getAuthUserId(): Promise<string> {
    const { data } = await supabase.auth.getUser();
    return data.user?.id || 'anonymous';
}

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
    fetchPosts: () => Promise<void>;
    fetchLikedPosts: (userId: string) => Promise<void>;
    fetchFollowers: (userId: string) => Promise<void>;
    fetchFollowing: (userId: string) => Promise<void>;
    hydrateSocial: (userId: string) => Promise<void>;
    setLikedPosts: (posts: SocialPost[]) => void;
    setFollowers: (followers: UserFollow[]) => void;
    setFollowing: (following: UserFollow[]) => void;
}

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
            posts: [],
            userPosts: [],
            likedPosts: [],
            followers: [],
            following: [],
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

                getAuthUserId().then(uid => syncSocial.likePost(id, uid, nowLiked));
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
                getAuthUserId().then(uid => syncSocial.toggleFollow(user.userId, uid, !isFollowing));
            },

            updateProfile: (updates) => set((state) => ({
                currentUser: { ...state.currentUser, ...updates }
            })),

            setLikedPosts: (posts) => set({ likedPosts: posts }),
            setFollowers: (followers) => set({ followers }),
            setFollowing: (following) => set({ following }),

            fetchPosts: async () => {
                try {
                    const { data: rows } = await supabase
                        .from('posts')
                        .select('id, user_id, image_url, caption, likes_count, created_at')
                        .order('created_at', { ascending: false })
                        .limit(50);
                    if (rows?.length) {
                        const userIds = [...new Set(rows.map((r: any) => r.user_id as string))];
                        const { data: profiles } = await supabase
                            .from('profiles')
                            .select('id, username, avatar_url')
                            .in('id', userIds);
                        const profileMap = new Map<string, { username: string; avatar_url?: string }>();
                        profiles?.forEach((p: any) => profileMap.set(p.id, { username: p.username, avatar_url: p.avatar_url }));

                        const posts: SocialPost[] = rows.map((row: any) => ({
                            id: row.id,
                            userId: row.user_id,
                            username: profileMap.get(row.user_id)?.username || '',
                            avatarUrl: profileMap.get(row.user_id)?.avatar_url || null,
                            imageUrl: row.image_url,
                            caption: row.caption || '',
                            clothingPieces: [],
                            likes: row.likes_count || 0,
                            liked: false,
                            comments: [],
                            createdAt: row.created_at,
                        }));
                        set({ posts });
                    }
                } catch (e) {
                    if (__DEV__) console.warn('fetchPosts failed:', e);
                }
            },

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
                    store.fetchPosts(),
                    store.fetchLikedPosts(userId),
                    store.fetchFollowers(userId),
                    store.fetchFollowing(userId),
                ]);
            },
        }),
        {
            name: 'social-storage',
            version: 3,
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({
                posts: state.posts,
                userPosts: state.userPosts,
                likedPosts: state.likedPosts,
                followers: state.followers,
                following: state.following,
                currentUser: state.currentUser,
            }),
        },
    ),
);
