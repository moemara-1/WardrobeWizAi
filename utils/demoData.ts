import { generateId } from '@/stores/closetStore';
import { ClosetItem, ClothingCategory, SavedTrip, UserPost } from '@/types';

export const DEMO_ITEMS: Partial<ClosetItem>[] = [
    {
        name: 'Classic White Tee',
        category: 'top' as ClothingCategory,
        brand: 'Everlane',
        colors: ['white'],
        image_url: 'https://cdn.dummyjson.com/product-images/mens-shirts/man-short-sleeve-shirt/1.webp',
        clean_image_url: 'https://cdn.dummyjson.com/product-images/mens-shirts/man-short-sleeve-shirt/1.webp',
    },
    {
        name: 'Cotton Jacket',
        category: 'outerwear' as ClothingCategory,
        brand: 'Levis',
        colors: ['green'],
        image_url: 'https://cdn.dummyjson.com/product-images/mens-shirts/blue-&-black-check-shirt/1.webp',
        clean_image_url: 'https://cdn.dummyjson.com/product-images/mens-shirts/blue-&-black-check-shirt/1.webp',
    },
    {
        name: 'Casual Slim Fit Shirt',
        category: 'top' as ClothingCategory,
        brand: 'J.Crew',
        colors: ['blue'],
        image_url: 'https://cdn.dummyjson.com/product-images/mens-shirts/man-plaid-shirt/1.webp',
        clean_image_url: 'https://cdn.dummyjson.com/product-images/mens-shirts/man-plaid-shirt/1.webp',
    },
    {
        name: 'Bi-Color T-Shirt',
        category: 'top' as ClothingCategory,
        brand: 'Nike',
        colors: ['red', 'white'],
        image_url: 'https://cdn.dummyjson.com/product-images/mens-shirts/gigabyte-aorus-men-tshirt/1.webp',
        clean_image_url: 'https://cdn.dummyjson.com/product-images/mens-shirts/gigabyte-aorus-men-tshirt/1.webp',
    },
    {
        name: 'Leather Jacket',
        category: 'outerwear' as ClothingCategory,
        brand: 'AllSaints',
        colors: ['black'],
        image_url: 'https://cdn.dummyjson.com/product-images/mens-shirts/men-check-shirt/1.webp',
        clean_image_url: 'https://cdn.dummyjson.com/product-images/mens-shirts/men-check-shirt/1.webp',
    },
    {
        name: 'Air Force 1 Sneakers',
        category: 'shoe' as ClothingCategory,
        brand: 'Nike',
        colors: ['white', 'red', 'black'],
        image_url: 'https://cdn.dummyjson.com/product-images/mens-shoes/nike-air-jordan-1-red-and-black/1.webp',
        clean_image_url: 'https://cdn.dummyjson.com/product-images/mens-shoes/nike-air-jordan-1-red-and-black/1.webp',
    },
    {
        name: 'Baseball Cleats',
        category: 'shoe' as ClothingCategory,
        brand: 'Nike',
        colors: ['black', 'white'],
        image_url: 'https://cdn.dummyjson.com/product-images/mens-shoes/nike-baseball-cleats/1.webp',
        clean_image_url: 'https://cdn.dummyjson.com/product-images/mens-shoes/nike-baseball-cleats/1.webp',
    },
    {
        name: 'Future Rider Trainers',
        category: 'shoe' as ClothingCategory,
        brand: 'Puma',
        colors: ['grey', 'blue'],
        image_url: 'https://cdn.dummyjson.com/product-images/mens-shoes/puma-future-rider-trainers/1.webp',
        clean_image_url: 'https://cdn.dummyjson.com/product-images/mens-shoes/puma-future-rider-trainers/1.webp',
    },
    {
        name: 'Classic Trench Coat',
        category: 'outerwear' as ClothingCategory,
        brand: 'Burberry',
        colors: ['tan'],
        image_url: 'https://cdn.dummyjson.com/product-images/mens-shoes/sports-sneakers-off-white-red/1.webp',
        clean_image_url: 'https://cdn.dummyjson.com/product-images/mens-shoes/sports-sneakers-off-white-red/1.webp',
    },
    {
        name: 'Crossbody Bag',
        category: 'bag' as ClothingCategory,
        brand: 'Gucci',
        colors: ['black'],
        image_url: 'https://cdn.dummyjson.com/product-images/mens-shoes/sports-sneakers-off-white-&-red/1.webp',
        clean_image_url: 'https://cdn.dummyjson.com/product-images/mens-shoes/sports-sneakers-off-white-&-red/1.webp',
    },
    {
        name: 'Summer Linen Dress',
        category: 'dress' as ClothingCategory,
        brand: 'ZARA',
        colors: ['white'],
        image_url: 'https://cdn.dummyjson.com/product-images/womens-dresses/corset-leather-with-skirt/1.webp',
        clean_image_url: 'https://cdn.dummyjson.com/product-images/womens-dresses/corset-leather-with-skirt/1.webp',
    },
    {
        name: 'Oversized Blazer',
        category: 'outerwear' as ClothingCategory,
        brand: 'Frankie Shop',
        colors: ['brown'],
        image_url: 'https://cdn.dummyjson.com/product-images/womens-shoes/chappal-gold-without-heel/1.webp',
        clean_image_url: 'https://cdn.dummyjson.com/product-images/womens-shoes/chappal-gold-without-heel/1.webp',
    }
];

export const generateDemoItems = (): ClosetItem[] => {
    return DEMO_ITEMS.map((item, index) => ({
        ...item,
        id: `demo_item_${index}_${generateId()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        favorite: false,
        wear_count: 0,
        tags: [],
        colors: item.colors || [],
        detected_confidence: 0.99,
    } as ClosetItem));
};

export const DEMO_PROFILES = [
    { id: 'demo_prof_1', display_name: 'Sarah Mitchell', avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80', items: [] },
    { id: 'demo_prof_2', display_name: 'Alex Rivera', avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80', items: [] },
    { id: 'demo_prof_3', display_name: 'Jessica Chu', avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80', items: [] },
];

export const generateDemoProfiles = (demoItems: ClosetItem[]) => {
    // Distribute the demo items among the 3 profiles to show in Discover
    return DEMO_PROFILES.map((prof, i) => ({
        ...prof,
        username: prof.display_name,
        pfp_url: prof.avatar_url,
        items: [
            demoItems[(i * 2) % demoItems.length],
            demoItems[((i * 2) + 1) % demoItems.length],
            demoItems[((i * 2) + 2) % demoItems.length]
        ],
    }));
};

// Removed broken demo outfits array

export const DEMO_POSTS: Partial<UserPost>[] = [
    {
        image_url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80',
        caption: 'Loving this new vintage find matching with the classic sneakers. #ootd #vintage',
    },
    {
        image_url: 'https://images.unsplash.com/photo-1549298240-0d8e60513026?auto=format&fit=crop&w=800&q=80',
        caption: 'Street style essentials keeping me warm today ☕❄️',
    },
    {
        image_url: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=800&q=80',
        caption: 'When the layers hit just right. Ready for the weekend trip.',
    },
    {
        image_url: 'https://images.unsplash.com/photo-1516257984-b1b4d707412e?auto=format&fit=crop&w=800&q=80',
        caption: 'Minimalism at its peak. Can never go wrong with these shades.',
    },
    {
        image_url: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=800&q=80',
        caption: 'Going out tonight! What do we think of the new jacket? ✨',
    },
    {
        image_url: 'https://images.unsplash.com/photo-1492707892479-7bc8d5a4ee93?auto=format&fit=crop&w=800&q=80',
        caption: 'NYC street style is always undefeated. Taking inspo.',
    },
    {
        image_url: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=800&q=80',
        caption: 'Shopping day haul! Cant wait to scan these into the closet.',
    }
];

export const generateDemoPosts = (demoItems: ClosetItem[]): UserPost[] => {
    return DEMO_POSTS.map((post, index) => ({
        ...post,
        id: generateId('demo_post'),
        tagged_item_ids: [demoItems[index % demoItems.length].id],
        created_at: new Date().toISOString(),
    } as UserPost));
};

export const DEMO_TRIPS: Partial<SavedTrip>[] = [
    { destination: 'Paris, France', days: 5, occasion: 'vacation' },
    { destination: 'Tokyo, Japan', days: 7, occasion: 'fun' },
    { destination: 'New York City, NY', days: 3, occasion: 'business' },
];

export const generateDemoTrips = (): SavedTrip[] => {
    return DEMO_TRIPS.map(trip => ({
        ...trip,
        id: generateId('demo_trip'),
        created_at: new Date().toISOString(),
    } as SavedTrip));
};
