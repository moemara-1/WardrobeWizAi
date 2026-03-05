import { generateId } from '@/stores/closetStore';
import { ClosetItem, ClothingCategory, Outfit, SavedTrip, UserPost } from '@/types';

export const DEMO_ITEMS: Partial<ClosetItem>[] = [
    {
        name: 'Classic White Tee',
        category: 'top' as ClothingCategory,
        brand: 'Everlane',
        colors: ['white'],
        image_url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80',
        clean_image_url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80',
    },
    {
        name: 'Vintage Denim Jeans',
        category: 'bottom' as ClothingCategory,
        brand: 'Levi\'s',
        colors: ['blue'],
        image_url: 'https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=800&q=80',
        clean_image_url: 'https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=800&q=80',
    },
    {
        name: 'Leather Biker Jacket',
        category: 'outerwear' as ClothingCategory,
        brand: 'AllSaints',
        colors: ['black'],
        image_url: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=800&q=80',
        clean_image_url: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=800&q=80',
    },
    {
        name: 'Air Force 1 Sneakers',
        category: 'shoe' as ClothingCategory,
        brand: 'Nike',
        colors: ['white'],
        image_url: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=800&q=80',
        clean_image_url: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=800&q=80',
    },
    {
        name: 'Silk Button-Up',
        category: 'top' as ClothingCategory,
        brand: 'Reformation',
        colors: ['beige'],
        image_url: 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=800&q=80',
        clean_image_url: 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=800&q=80',
    },
    {
        name: 'Pleated Midi Skirt',
        category: 'bottom' as ClothingCategory,
        brand: 'Aritzia',
        colors: ['green'],
        image_url: 'https://images.unsplash.com/photo-1582142407894-ec85a1260a46?auto=format&fit=crop&w=800&q=80',
        clean_image_url: 'https://images.unsplash.com/photo-1582142407894-ec85a1260a46?auto=format&fit=crop&w=800&q=80',
    },
    {
        name: 'Cashmere Sweater',
        category: 'top' as ClothingCategory,
        brand: 'Naadam',
        colors: ['grey'],
        image_url: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&w=800&q=80',
        clean_image_url: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&w=800&q=80',
    },
    {
        name: 'Chelsea Boots',
        category: 'shoe' as ClothingCategory,
        brand: 'Dr. Martens',
        colors: ['black'],
        image_url: 'https://images.unsplash.com/photo-1638247025967-b4e38f787b76?auto=format&fit=crop&w=800&q=80',
        clean_image_url: 'https://images.unsplash.com/photo-1638247025967-b4e38f787b76?auto=format&fit=crop&w=800&q=80',
    },
    {
        name: 'Classic Trench Coat',
        category: 'outerwear' as ClothingCategory,
        brand: 'Burberry',
        colors: ['tan'],
        image_url: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=800&q=80',
        clean_image_url: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=800&q=80',
    },
    {
        name: 'Crossbody Bag',
        category: 'bag' as ClothingCategory,
        brand: 'Gucci',
        colors: ['black'],
        image_url: 'https://images.unsplash.com/photo-1584916201218-f4242ceb4809?auto=format&fit=crop&w=800&q=80',
        clean_image_url: 'https://images.unsplash.com/photo-1584916201218-f4242ceb4809?auto=format&fit=crop&w=800&q=80',
    },
    {
        name: 'Summer Linen Dress',
        category: 'dress' as ClothingCategory,
        brand: 'ZARA',
        colors: ['white'],
        image_url: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=800&q=80',
        clean_image_url: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=800&q=80',
    },
    {
        name: 'Oversized Blazer',
        category: 'outerwear' as ClothingCategory,
        brand: 'Frankie Shop',
        colors: ['brown'],
        image_url: 'https://images.unsplash.com/photo-1592878904946-b3cd8ae243d0?auto=format&fit=crop&w=800&q=80',
        clean_image_url: 'https://images.unsplash.com/photo-1592878904946-b3cd8ae243d0?auto=format&fit=crop&w=800&q=80',
    }
];

export const generateDemoItems = (): ClosetItem[] => {
    return DEMO_ITEMS.map((item, index) => ({
        ...item,
        id: `demo_${index}_${generateId()}`,
        created_at: new Date().toISOString(),
        garment_slot: undefined, // will auto bucket if needed, but not strictly required
        detected_confidence: 0.99,
    } as ClosetItem));
};

export const DEMO_OUTFITS: Partial<Outfit>[] = [
    {
        name: 'Coffee Shop Casual',
        item_ids: [],
        collage_url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80',
        seasons: ['fall', 'spring'],
        ai_notes: 'Effortless and comfortable look perfect for a quick weekend outing.',
    },
    {
        name: 'Evening Dinner Plan',
        item_ids: [],
        collage_url: 'https://images.unsplash.com/photo-1434389678369-184ea6daea17?auto=format&fit=crop&w=800&q=80',
        seasons: ['summer'],
        ai_notes: 'A sharper silhouette that stands out during dim lighting.',
    },
    {
        name: 'Office Hybrid',
        item_ids: [],
        collage_url: 'https://images.unsplash.com/photo-1485230895905-ef171bb5723b?auto=format&fit=crop&w=800&q=80',
        seasons: ['winter'],
        ai_notes: 'Professional yet relaxed, great for modern workspaces.',
    }
];

export const generateDemoOutfits = (demoItems: ClosetItem[]): Outfit[] => {
    return DEMO_OUTFITS.map((outfit, index) => {
        // just grab 3 random items from demo items to satisfy the array constraints
        const itemsSubset = [demoItems[index % demoItems.length], demoItems[(index + 1) % demoItems.length], demoItems[(index + 2) % demoItems.length]];
        return {
            ...outfit,
            id: generateId('demo_outfit'),
            user_id: 'me',
            items: itemsSubset,
            item_ids: itemsSubset.map(i => i.id),
            created_at: new Date().toISOString(),
            pinned: true,
        } as Outfit;
    });
};

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
        image_url: 'https://images.unsplash.com/photo-1550614000-4b95d415d888?auto=format&fit=crop&w=800&q=80',
        caption: 'Minimalism at its peak. Can never go wrong with these shades.',
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
