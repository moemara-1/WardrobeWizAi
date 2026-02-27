-- Ensure username column exists
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS username TEXT;

-- Backfill missing usernames with their display_name, or a default string
UPDATE public.profiles
SET username = COALESCE(display_name, 'user')
WHERE username IS NULL;
