import { supabase } from '@/lib/supabase';
import { PostComment, SocialPost, UserFollow } from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface SocialState {
    posts: SocialPost[];
    userPosts: SocialPost[];
    followers: UserFollow[];
    following: UserFollow[];
    isLoading: boolean;

    // User Profile
    currentUser: {
        username: string;
        avatarUrl: string | null;
        bio: string | null;
    };

    fetchFeed: () => Promise<void>;
    fetchUserPosts: (userId: string) => Promise<void>;
    addPost: (post: Omit<SocialPost, 'id' | 'likes' | 'liked' | 'comments' | 'created_at' | 'username' | 'avatar_url'>) => Promise<void>;
    deletePost: (id: string) => Promise<void>;
    likePost: (id: string, userId: string) => Promise<void>;
    addComment: (postId: string, text: string, userId: string, username: string, avatarUrl: string | null) => Promise<void>;
    toggleFollow: (targetUserId: string, currentUserId: string) => Promise<void>;
    updateProfile: (updates: Partial<{ username: string; avatarUrl: string | null; bio: string | null }>) => void;
}

export const useSocialStore = create<SocialState>()(
    persist(
        (set, get) => ({
            posts: [],
            userPosts: [],
            followers: [],
            following: [],
            isLoading: false,
            currentUser: {
                username: 'User',
                avatarUrl: null,
                bio: 'Fashion enthusiast | WardrobeWiz user',
            },

            fetchFeed: async () => {
                set({ isLoading: true });
                try {
                    const { data, error } = await supabase
                        .from('posts')
                        .select(`
                            id, user_id, image_url, caption, created_at,
                            profiles!posts_user_id_fkey (username, avatar_url),
                            post_likes (user_id),
                            post_comments (
                                id, user_id, text, created_at,
                                profiles (username, avatar_url)
                            )
                            /* 
                                Note: We are not fetching clothing pieces yet as it requires 
                                a complex join or a JSONB column 'tagged_items'.
                                For now we assume empty clothing pieces or fetch later.
                            */
                        `)
                        .order('created_at', { ascending: false })
                        .limit(50);

                    if (error) throw error;

                    const currentUserId = (await supabase.auth.getUser()).data.user?.id;

                    const posts: SocialPost[] = data.map((row: any) => ({
                        id: row.id,
                        user_id: row.user_id,
                        username: row.profiles?.username || 'Unknown',
                        avatar_url: row.profiles?.avatar_url || null,
                        image_url: row.image_url,
                        caption: row.caption || '',
                        clothing_pieces: [], // TODO: Implementation depends on schema
                        likes: row.post_likes?.length || 0,
                        liked: row.post_likes?.some((l: any) => l.user_id === currentUserId) || false,
                        comments: row.post_comments?.map((c: any) => ({
                            id: c.id,
                            user_id: c.user_id,
                            username: c.profiles?.username || 'Unknown',
                            avatar_url: c.profiles?.avatar_url || null,
                            text: c.text,
                            created_at: c.created_at,
                        })) || [],
                        created_at: row.created_at,
                    }));

                    set({ posts });
                } catch (e) {
                    console.error('fetchFeed error:', e);
                } finally {
                    set({ isLoading: false });
                }
            },

            fetchUserPosts: async (userId: string) => {
                try {
                    const { data, error } = await supabase
                        .from('posts')
                        .select('*')
                        .eq('user_id', userId)
                        .order('created_at', { ascending: false });

                    if (error) throw error;
                    // Simplified mapping since we don't need full social context for valid grid
                    const userPosts: SocialPost[] = data.map((row: any) => ({
                        id: row.id,
                        user_id: row.user_id,
                        username: 'Me',
                        avatar_url: null,
                        image_url: row.image_url,
                        caption: row.caption || '',
                        clothing_pieces: [],
                        likes: 0,
                        liked: false,
                        comments: [],
                        created_at: row.created_at,
                    }));
                    set({ userPosts });
                } catch (e) {
                    console.error('fetchUserPosts error:', e);
                }
            },

            addPost: async (postData) => {
                try {
                    const { data, error } = await supabase.from('posts').insert({
                        user_id: postData.user_id,
                        image_url: postData.image_url,
                        caption: postData.caption,
                        // tagged_items: postData.clothing_pieces 
                    }).select().single();

                    if (error) throw error;

                    // Optimistic update or refetch
                    get().fetchFeed();
                } catch (e) {
                    console.error('addPost error:', e);
                }
            },

            deletePost: async (id) => {
                try {
                    await supabase.from('posts').delete().eq('id', id);
                    set((state) => ({
                        posts: state.posts.filter((p) => p.id !== id),
                        userPosts: state.userPosts.filter((p) => p.id !== id),
                    }));
                } catch (e) {
                    console.error('deletePost error:', e);
                }
            },

            likePost: async (postId, userId) => {
                // Optimistic UI
                set((state) => ({
                    posts: state.posts.map((p) =>
                        p.id === postId
                            ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 }
                            : p
                    ),
                }));

                try {
                    const post = get().posts.find(p => p.id === postId);
                    if (post?.liked) {
                        await supabase.from('post_likes').insert({ post_id: postId, user_id: userId });
                    } else {
                        await supabase.from('post_likes').delete().match({ post_id: postId, user_id: userId });
                    }
                } catch (e) {
                    console.error('likePost error:', e);
                    // Revert?
                }
            },

            addComment: async (postId, text, userId, username, avatarUrl) => {
                const tempId = `temp-${Date.now()}`;
                const newComment: PostComment = {
                    id: tempId,
                    user_id: userId,
                    username,
                    avatar_url: avatarUrl,
                    text: text,
                    created_at: new Date().toISOString(),
                };

                // Optimistic
                set((state) => ({
                    posts: state.posts.map((p) =>
                        p.id === postId
                            ? { ...p, comments: [...p.comments, newComment] }
                            : p
                    ),
                }));

                try {
                    const { data, error } = await supabase.from('post_comments').insert({
                        post_id: postId,
                        user_id: userId,
                        text: text,
                    }).select().single();

                    if (error) throw error;

                    // Update ID
                    set((state) => ({
                        posts: state.posts.map((p) =>
                            p.id === postId
                                ? {
                                    ...p,
                                    comments: p.comments.map(c => c.id === tempId ? { ...c, id: data.id } : c)
                                }
                                : p
                        ),
                    }));
                } catch (e) {
                    console.error('addComment error:', e);
                }
            },

            toggleFollow: async (targetUserId, currentUserId) => {
                // TODO: Implement follow logic with 'follows' table
                console.log('toggleFollow not implemented yet in backend', targetUserId);
            },

            updateProfile: (updates) => set((state) => ({
                currentUser: { ...state.currentUser, ...updates }
            })),
        }),
        {
            name: 'social-storage',
            version: 2, // Bump version for migration
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({
                userPosts: state.userPosts,
                currentUser: state.currentUser,
                // Don't persist feed posts forever, maybe?
            }),
        },
    ),
);
