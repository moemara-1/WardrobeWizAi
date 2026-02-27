-- Enable RLS for likes and comments
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Policies for 'likes' table
DROP POLICY IF EXISTS "Likes are viewable by everyone." ON likes;
CREATE POLICY "Likes are viewable by everyone." 
  ON likes FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Users can insert their own likes." ON likes;
CREATE POLICY "Users can insert their own likes." 
  ON likes FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own likes." ON likes;
CREATE POLICY "Users can delete their own likes." 
  ON likes FOR DELETE 
  USING (auth.uid() = user_id);

-- Policies for 'comments' table
DROP POLICY IF EXISTS "Comments are viewable by everyone." ON comments;
CREATE POLICY "Comments are viewable by everyone." 
  ON comments FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Users can insert their own comments." ON comments;
CREATE POLICY "Users can insert their own comments." 
  ON comments FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own comments." ON comments;
CREATE POLICY "Users can update their own comments." 
  ON comments FOR UPDATE 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own comments." ON comments;
CREATE POLICY "Users can delete their own comments." 
  ON comments FOR DELETE 
  USING (auth.uid() = user_id);
