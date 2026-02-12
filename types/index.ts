// Core type definitions for WardrobeWizAi

export type ClothingCategory =
    | "top"
    | "bottom"
    | "outerwear"
    | "dress"
    | "shoe"
    | "accessory"
    | "bag"
    | "hat"
    | "jewelry"
    | "other";

export type Season = "spring" | "summer" | "fall" | "winter";
export type Occasion = "casual" | "work" | "formal" | "date" | "sport" | "party";
export type StyleProfile = "streetwear" | "classic" | "minimal" | "bohemian" | "athletic" | "preppy";

export interface ClosetItem {
    id: string;
    user_id: string;
    image_url: string;
    thumbnail_url?: string;
    clean_image_url?: string;      // White background version
    original_image_url?: string;   // Original photo context
    name: string;
    category: ClothingCategory;
    subcategory?: string;
    brand?: string;
    brand_confidence?: number;     // AI confidence in brand identification
    model_name?: string;           // Specific product model name
    colors: string[];
    size?: string;
    purchase_date?: string;
    price?: number;
    estimated_value?: number;      // AI-estimated retail price
    product_url?: string;          // Link to product online
    detected_confidence: number;
    tags: string[];
    wear_count: number;
    last_worn?: string;
    favorite: boolean;
    garment_type?: string;
    layer_type?: 'inner' | 'outer' | 'both';
    created_at: string;
    updated_at: string;
}

export interface Outfit {
    id: string;
    user_id: string;
    items: ClosetItem[];
    item_ids: string[];
    collage_url?: string;
    name: string;
    theme?: StyleProfile;
    occasion?: Occasion;
    seasons: Season[];
    ai_notes?: string;
    weather_temp_min?: number;
    weather_temp_max?: number;
    pinned: boolean;
    created_at: string;
}

export interface Detection {
    id: string;
    bounding_box: BoundingBox;
    category: ClothingCategory;
    confidence: number;
    suggested_name?: string;
    colors: string[];
    brand_guess?: string;
}

export interface BoundingBox {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface UserProfile {
    id: string;
    email: string;
    display_name?: string;
    avatar_url?: string;
    style_preferences: StyleProfile[];
    favorite_colors: string[];
    sizes: Record<ClothingCategory, string>;
    onboarding_complete: boolean;
    created_at: string;
}

export interface OutfitSuggestion {
    items: ClosetItem[];
    reasoning: string;
    occasion: Occasion;
    weather_appropriate: boolean;
    style_match_score: number;
}

export interface DigitalTwin {
    id: string;
    user_id: string;
    selfie_url: string;
    body_url?: string;
    skin_color: string;
    hair_color: string;
    additional_details?: string;
    ai_description: string;          // AI-generated appearance profile
    body_type?: string;              // AI-detected body type
    style_recommendations?: string;  // AI style tips based on appearance
    created_at: string;
    updated_at: string;
}

// API Response types
export interface AnalysisResult {
    detections: Detection[];
    processing_time_ms: number;
    model_used: "ml_kit" | "api4ai" | "openai" | "gemini" | "mock";
}

export interface OutfitGenerationRequest {
    base_items: string[]; // Item IDs to include
    occasion?: Occasion;
    style?: StyleProfile;
    weather_temp?: number;
    exclude_items?: string[];
}
