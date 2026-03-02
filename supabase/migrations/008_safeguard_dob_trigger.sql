-- Safeguard the Date of Birth parsing in the handle_new_user trigger
-- If the given dob string cannot be cast to DATE, default it to NULL instead of aborting the transaction.

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  parsed_dob DATE;
BEGIN
  -- Attempt to safely cast the incoming Date of Birth.
  -- The app frontend now formats it as YYYY-MM-DD, but this safeguards against old app versions
  -- or manual signups with malformed dates.
  BEGIN
    parsed_dob := (NEW.raw_user_meta_data->>'dob')::DATE;
  EXCEPTION WHEN invalid_datetime_format OR others THEN
    parsed_dob := NULL;
  END;

  INSERT INTO public.profiles (id, display_name, username, dob, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'username',
      split_part(NEW.email, '@', 1)
    ),
    parsed_dob,
    COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'picture'
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
