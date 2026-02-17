-- Posts table for community sharing
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  caption TEXT,
  tagged_item_ids UUID[] DEFAULT '{}',
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view all posts (community feed)
CREATE POLICY "Anyone can view all posts" ON posts
  FOR SELECT USING (true);
CREATE POLICY "Users can insert own posts" ON posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own posts" ON posts
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own posts" ON posts
  FOR DELETE USING (auth.uid() = user_id);

-- Add public read policies for community visibility on profiles and items
CREATE POLICY "Anyone can view all profiles" ON profiles
  FOR SELECT USING (true);
CREATE POLICY "Anyone can view all items" ON items
  FOR SELECT USING (true);

-- Drop the old owner-only SELECT policies (they conflict with the new public ones)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own items" ON items;
