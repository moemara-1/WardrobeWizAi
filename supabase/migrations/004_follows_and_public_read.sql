-- ─── Follows Table ───
CREATE TABLE IF NOT EXISTS follows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  follower_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);

CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);

-- Enable RLS on follows
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

-- Anyone can see who follows whom
CREATE POLICY "Follows are publicly readable" ON follows
  FOR SELECT USING (true);

-- Users can follow others (insert)
CREATE POLICY "Users can follow others" ON follows
  FOR INSERT WITH CHECK (auth.uid() = follower_id);

-- Users can unfollow (delete own follow records)
CREATE POLICY "Users can unfollow" ON follows
  FOR DELETE USING (auth.uid() = follower_id);

-- ─── Fix Profiles RLS ───
-- Allow anyone to read any profile (needed for user discovery, community, etc.)
CREATE POLICY "Profiles are publicly readable" ON profiles
  FOR SELECT USING (true);

-- Allow users to insert their own profile (auto-created by trigger, but needed for upsert)
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ─── Fix Items RLS ───
-- Allow anyone to read any items (needed for community closet browsing)
CREATE POLICY "Items are publicly readable" ON items
  FOR SELECT USING (true);
