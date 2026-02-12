-- WardrobeWizAi Database Schema
-- Run this in Supabase SQL Editor or via supabase db push

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Custom enum for clothing categories
CREATE TYPE clothing_category AS ENUM (
  'top', 'bottom', 'outerwear', 'dress', 'shoe',
  'accessory', 'bag', 'hat', 'jewelry', 'other'
);

-- ─── Profiles ───
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  style_preferences TEXT[] DEFAULT '{}',
  favorite_colors TEXT[] DEFAULT '{}',
  onboarding_complete BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ─── Items ───
CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  clean_image_url TEXT,
  original_image_url TEXT,
  name TEXT NOT NULL,
  category clothing_category NOT NULL DEFAULT 'other',
  subcategory TEXT,
  brand TEXT,
  brand_confidence REAL,
  model_name TEXT,
  colors TEXT[] DEFAULT '{}',
  size TEXT,
  purchase_date TIMESTAMPTZ,
  price NUMERIC(10,2),
  estimated_value NUMERIC(10,2),
  product_url TEXT,
  detected_confidence REAL DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  wear_count INTEGER DEFAULT 0,
  last_worn TIMESTAMPTZ,
  favorite BOOLEAN DEFAULT FALSE,
  garment_type TEXT,
  layer_type TEXT CHECK (layer_type IN ('inner', 'outer', 'both')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_items_user_id ON items(user_id);
CREATE INDEX idx_items_category ON items(user_id, category);

-- ─── Outfits ───
CREATE TABLE outfits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  item_ids UUID[] DEFAULT '{}',
  collage_url TEXT,
  theme TEXT,
  occasion TEXT,
  seasons TEXT[] DEFAULT '{}',
  ai_notes TEXT,
  weather_temp_min INTEGER,
  weather_temp_max INTEGER,
  pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_outfits_user_id ON outfits(user_id);

-- ─── Digital Twins ───
CREATE TABLE digital_twins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  selfie_url TEXT NOT NULL,
  body_url TEXT,
  twin_image_url TEXT,
  skin_color TEXT,
  hair_color TEXT,
  additional_details TEXT,
  body_type TEXT,
  ai_description TEXT,
  style_recommendations TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Row Level Security ───
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE outfits ENABLE ROW LEVEL SECURITY;
ALTER TABLE digital_twins ENABLE ROW LEVEL SECURITY;

-- Profiles: users can only read/update their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Items: full CRUD on own items
CREATE POLICY "Users can view own items" ON items
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own items" ON items
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own items" ON items
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own items" ON items
  FOR DELETE USING (auth.uid() = user_id);

-- Outfits: full CRUD on own outfits
CREATE POLICY "Users can view own outfits" ON outfits
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own outfits" ON outfits
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own outfits" ON outfits
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own outfits" ON outfits
  FOR DELETE USING (auth.uid() = user_id);

-- Digital Twins: full CRUD on own twin
CREATE POLICY "Users can view own twin" ON digital_twins
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own twin" ON digital_twins
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own twin" ON digital_twins
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own twin" ON digital_twins
  FOR DELETE USING (auth.uid() = user_id);

-- ─── Storage Policies ───
-- Run these after creating the 'wardrobe-images' bucket in the Supabase dashboard
-- Bucket should be PUBLIC for read access (images are displayed in the app)

-- Allow authenticated users to upload to their own folder
-- CREATE POLICY "Users can upload own images" ON storage.objects
--   FOR INSERT WITH CHECK (
--     bucket_id = 'wardrobe-images'
--     AND auth.uid()::text = (storage.foldername(name))[1]
--   );

-- Allow anyone to view images (public bucket)
-- CREATE POLICY "Public image access" ON storage.objects
--   FOR SELECT USING (bucket_id = 'wardrobe-images');

-- Allow users to delete their own images
-- CREATE POLICY "Users can delete own images" ON storage.objects
--   FOR DELETE USING (
--     bucket_id = 'wardrobe-images'
--     AND auth.uid()::text = (storage.foldername(name))[1]
--   );

-- ─── Updated At Trigger ───
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER items_updated_at
  BEFORE UPDATE ON items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER digital_twins_updated_at
  BEFORE UPDATE ON digital_twins
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
