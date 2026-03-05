import { generateId } from '@/stores/closetStore';
import { ClosetItem, ClothingCategory, SavedTrip, UserPost } from '@/types';

export const DEMO_ITEMS: Partial<ClosetItem>[] = [
    {
        name: 'Classic White Tee',
        category: 'top' as ClothingCategory,
        brand: 'Everlane',
        colors: ['white'],
        image_url: 'https://fakestoreapi.com/img/71-3HjGNDUL._AC_SY879._SX._UX._SY._UY_.jpg',
        clean_image_url: 'https://fakestoreapi.com/img/71-3HjGNDUL._AC_SY879._SX._UX._SY._UY_.jpg',
    },
    {
        name: 'Cotton Jacket',
        category: 'outerwear' as ClothingCategory,
        brand: 'Levis',
        colors: ['green'],
        image_url: 'https://fakestoreapi.com/img/71li-ujtlVG._AC_UX679_.jpg',
        clean_image_url: 'https://fakestoreapi.com/img/71li-ujtlVG._AC_UX679_.jpg',
    },
    {
        name: 'Casual Slim Fit Shirt',
        category: 'top' as ClothingCategory,
        brand: 'J.Crew',
        colors: ['blue'],
        image_url: 'https://fakestoreapi.com/img/71YXzeOuslL._AC_UY879_.jpg',
        clean_image_url: 'https://fakestoreapi.com/img/71YXzeOuslL._AC_UY879_.jpg',
    },
    {
        name: 'Bi-Color T-Shirt',
        category: 'top' as ClothingCategory,
        brand: 'Nike',
        colors: ['red', 'white'],
        image_url: 'https://fakestoreapi.com/img/51Y5NI-I5jL._AC_UX679_.jpg',
        clean_image_url: 'https://fakestoreapi.com/img/51Y5NI-I5jL._AC_UX679_.jpg',
    },
    {
        name: 'Leather Jacket',
        category: 'outerwear' as ClothingCategory,
        brand: 'AllSaints',
        colors: ['black'],
        image_url: 'https://fakestoreapi.com/img/81XH0e8fefL._AC_UY879_.jpg',
        clean_image_url: 'https://fakestoreapi.com/img/81XH0e8fefL._AC_UY879_.jpg',
    },
    {
        name: 'Raincoat Outerwear',
        category: 'outerwear' as ClothingCategory,
        brand: 'Patagonia',
        colors: ['grey'],
        image_url: 'https://fakestoreapi.com/img/71HblAHs5xL._AC_UY879_-2.jpg',
        clean_image_url: 'https://fakestoreapi.com/img/71HblAHs5xL._AC_UY879_-2.jpg',
    },
    {
        name: 'Solid Short Sleeve',
        category: 'top' as ClothingCategory,
        brand: 'Uniqlo',
        colors: ['red'],
        image_url: 'https://fakestoreapi.com/img/71z3kpMAYsL._AC_UY879_.jpg',
        clean_image_url: 'https://fakestoreapi.com/img/71z3kpMAYsL._AC_UY879_.jpg',
    },
    {
        name: 'Everyday Backpack',
        category: 'bag' as ClothingCategory,
        brand: 'Fjallraven',
        colors: ['navy'],
        image_url: 'https://fakestoreapi.com/img/81fPKd-2AYL._AC_SL1500_.jpg',
        clean_image_url: 'https://fakestoreapi.com/img/81fPKd-2AYL._AC_SL1500_.jpg',
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
        image_url: 'https://images.unsplash.com/photo-1550614000-4b95d415d888?auto=format&fit=crop&w=800&q=80',
        caption: 'Minimalism at its peak. Can never go wrong with these shades.',
    },
    {
        image_url: 'https://images.unsplash.com/photo-1520975954732-57dd22299614?auto=format&fit=crop&w=800&q=80',
        caption: 'Going out tonight! What do we think of the new jacket? ✨',
    },
    {
        image_url: 'https://images.unsplash.com/photo-1620012253295-c15bc3e6590d?auto=format&fit=crop&w=800&q=80',
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
