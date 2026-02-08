-- Function to check if two users are compatible based on their match_settings
-- This checks: age range, gender preference, and distance

CREATE OR REPLACE FUNCTION check_user_compatibility(
  user1_id UUID,
  user2_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  user1_record RECORD;
  user2_record RECORD;
  age1 INTEGER;
  age2 INTEGER;
  distance_km NUMERIC;
BEGIN
  -- Fetch both users' data
  SELECT 
    dob, 
    match_settings,
    location
  INTO user1_record
  FROM public.users
  WHERE id = user1_id;
  
  SELECT 
    dob, 
    match_settings,
    location
  INTO user2_record
  FROM public.users
  WHERE id = user2_id;
  
  -- If either user doesn't exist or has no settings, no match
  IF user1_record IS NULL OR user2_record IS NULL OR 
     user1_record.match_settings IS NULL OR user2_record.match_settings IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Calculate ages from DOB (if available)
  IF user1_record.dob IS NOT NULL THEN
    age1 := EXTRACT(YEAR FROM AGE(user1_record.dob::date));
  ELSE
    age1 := NULL;
  END IF;
  
  IF user2_record.dob IS NOT NULL THEN
    age2 := EXTRACT(YEAR FROM AGE(user2_record.dob::date));
  ELSE
    age2 := NULL;
  END IF;
  
  -- Check age compatibility with range (minAge, maxAge)
  IF age1 IS NOT NULL AND age2 IS NOT NULL THEN
    -- Check if User2's age falls within User1's preferred age range
    IF (user1_record.match_settings->>'minAge')::INTEGER IS NOT NULL AND
       (user1_record.match_settings->>'maxAge')::INTEGER IS NOT NULL THEN
      IF age2 < (user1_record.match_settings->>'minAge')::INTEGER OR
         age2 > (user1_record.match_settings->>'maxAge')::INTEGER THEN
        RETURN FALSE;
      END IF;
    END IF;
    
    -- Check if User1's age falls within User2's preferred age range
    IF (user2_record.match_settings->>'minAge')::INTEGER IS NOT NULL AND
       (user2_record.match_settings->>'maxAge')::INTEGER IS NOT NULL THEN
      IF age1 < (user2_record.match_settings->>'minAge')::INTEGER OR
         age1 > (user2_record.match_settings->>'maxAge')::INTEGER THEN
        RETURN FALSE;
      END IF;
    END IF;
  END IF;
  
  -- Check gender compatibility
  -- If user1 wants specific gender, check if user2 matches
  IF (user1_record.match_settings->>'gender') IS NOT NULL AND
     (user1_record.match_settings->>'gender') != 'both' THEN
    -- Get user2's actual gender from users table
    IF NOT EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = user2_id 
      AND (gender = (user1_record.match_settings->>'gender') OR gender IS NULL)
    ) THEN
      RETURN FALSE;
    END IF;
  END IF;
  
  -- If user2 wants specific gender, check if user1 matches
  IF (user2_record.match_settings->>'gender') IS NOT NULL AND
     (user2_record.match_settings->>'gender') != 'both' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = user1_id 
      AND (gender = (user2_record.match_settings->>'gender') OR gender IS NULL)
    ) THEN
      RETURN FALSE;
    END IF;
  END IF;
  
  -- Check distance compatibility (if both have locations)
  IF user1_record.location IS NOT NULL AND user2_record.location IS NOT NULL THEN
    -- Calculate distance in kilometers using PostGIS
    -- Location is already geography type, no need to cast
    distance_km := ST_Distance(
      user1_record.location,
      user2_record.location
    ) / 1000.0;
    
    -- Check against both users' distance preferences
    IF (user1_record.match_settings->>'distance')::NUMERIC IS NOT NULL THEN
      IF distance_km > (user1_record.match_settings->>'distance')::NUMERIC THEN
        RETURN FALSE;
      END IF;
    END IF;
    
    IF (user2_record.match_settings->>'distance')::NUMERIC IS NOT NULL THEN
      IF distance_km > (user2_record.match_settings->>'distance')::NUMERIC THEN
        RETURN FALSE;
      END IF;
    END IF;
  END IF;
  
  -- All checks passed
  RETURN TRUE;
END;
$$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_match_settings ON public.users USING GIN (match_settings);
CREATE INDEX IF NOT EXISTS idx_users_location ON public.users USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_users_dob ON public.users (dob);
CREATE INDEX IF NOT EXISTS idx_users_gender ON public.users (gender);

-- Create a materialized view for pre-computed compatible user pairs (optional optimization)
CREATE MATERIALIZED VIEW IF NOT EXISTS user_compatibility_cache AS
SELECT 
  u1.id as user1_id,
  u2.id as user2_id,
  check_user_compatibility(u1.id, u2.id) as is_compatible
FROM public.users u1
CROSS JOIN public.users u2
WHERE u1.id < u2.id
  AND u1.match_settings IS NOT NULL
  AND u2.match_settings IS NOT NULL;

-- Create index on the materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_compatibility_cache 
ON user_compatibility_cache (user1_id, user2_id);

-- Function to refresh compatibility cache for a specific user
CREATE OR REPLACE FUNCTION refresh_user_compatibility_cache(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  -- Simply refresh the entire materialized view
  -- This is more efficient than trying to update specific rows
  REFRESH MATERIALIZED VIEW CONCURRENTLY user_compatibility_cache;
END;
$$;