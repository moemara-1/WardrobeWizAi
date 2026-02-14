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
    followers: UserFollow[];
    following: UserFollow[];

    // User Profile
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

export const useSocialStore = create<SocialState>()(
    persist(
        (set, get) => ({
            posts: SEED_POSTS,
            userPosts: [],
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

            likePost: (id) => set((state) => ({
                posts: state.posts.map((p) =>
                    p.id === id
                        ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 }
                        : p
                ),
            })),

            addComment: (postId, comment) => set((state) => ({
                posts: state.posts.map((p) =>
                    p.id === postId
                        ? { ...p, comments: [...p.comments, comment] }
                        : p
                ),
            })),

            toggleFollow: (user) => set((state) => {
                const isFollowing = state.following.some((f) => f.userId === user.userId);
                return {
                    following: isFollowing
                        ? state.following.filter((f) => f.userId !== user.userId)
                        : [...state.following, user],
                };
            }),

            updateProfile: (updates) => set((state) => ({
                currentUser: { ...state.currentUser, ...updates }
            })),
        }),
        {
            name: 'social-storage',
            version: 1,
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({
                userPosts: state.userPosts,
                followers: state.followers,
                following: state.following,
                currentUser: state.currentUser,
            }),
        },
    ),
);
