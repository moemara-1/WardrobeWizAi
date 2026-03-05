import { generateId } from '@/stores/closetStore';
import { ClosetItem, ClothingCategory } from '@/types';

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
    return DEMO_ITEMS.map(item => ({
        ...item,
        id: generateId('demo'),
        created_at: new Date().toISOString(),
        garment_slot: undefined, // will auto bucket if needed, but not strictly required
        detected_confidence: 0.99,
    } as ClosetItem));
};
