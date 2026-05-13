-- ============================================
-- Project One: Database Schema
-- ============================================
-- This schema defines all tables, functions, views, indexes, and row-level security policies
-- for the Project One deal-matching application.

-- ============================================
-- Enable Extensions
-- ============================================
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Users Table
-- ============================================
-- Note: Email and phone are managed by Supabase Auth; this table extends auth.users
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  phone TEXT,
  dob DATE,
  gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
  location GEOGRAPHY(POINT, 4326),
  match_settings JSONB DEFAULT '{"gender": "both", "minAge": 18, "maxAge": 65, "distance": 50}'::jsonb,
  notification_settings BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Deals Table
-- ============================================
CREATE TABLE IF NOT EXISTS public.deals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  merchant_name TEXT NOT NULL,
  deal_nature TEXT NOT NULL,
  time_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  time_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  terms_conditions TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Deal Images Table
-- ============================================
CREATE TABLE IF NOT EXISTS public.deal_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  filename TEXT NOT NULL,
  size_bytes INTEGER,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Swipes Table
-- ============================================
CREATE TABLE IF NOT EXISTS public.swipes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('left', 'right')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, deal_id)
);

-- ============================================
-- Matches Table
-- ============================================
CREATE TABLE IF NOT EXISTS public.matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user1_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user1_id, user2_id, deal_id),
  CHECK (user1_id < user2_id)
);

-- ============================================
-- Messages Table
-- ============================================
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Points Log Table
-- ============================================
CREATE TABLE IF NOT EXISTS public.points_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('login', 'complete_profile', 'match')),
  points_earned INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Indexes
-- ============================================
-- Users indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_match_settings ON public.users USING GIN (match_settings);
CREATE INDEX IF NOT EXISTS idx_users_location ON public.users USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_users_dob ON public.users (dob);
CREATE INDEX IF NOT EXISTS idx_users_gender ON public.users (gender);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON public.users (created_at);

-- Deals indexes
CREATE INDEX IF NOT EXISTS idx_deals_created_by ON public.deals (created_by);
CREATE INDEX IF NOT EXISTS idx_deals_is_active ON public.deals (is_active);
CREATE INDEX IF NOT EXISTS idx_deals_time_period ON public.deals (time_period_start, time_period_end);

-- Deal images indexes
CREATE INDEX IF NOT EXISTS idx_deal_images_deal_id ON public.deal_images (deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_images_is_primary ON public.deal_images (deal_id, is_primary);

-- Swipes indexes
CREATE INDEX IF NOT EXISTS idx_swipes_user_id ON public.swipes (user_id);
CREATE INDEX IF NOT EXISTS idx_swipes_deal_id ON public.swipes (deal_id);
CREATE INDEX IF NOT EXISTS idx_swipes_created_at ON public.swipes (created_at);

-- Matches indexes
CREATE INDEX IF NOT EXISTS idx_matches_user1_id ON public.matches (user1_id);
CREATE INDEX IF NOT EXISTS idx_matches_user2_id ON public.matches (user2_id);
CREATE INDEX IF NOT EXISTS idx_matches_deal_id ON public.matches (deal_id);

-- Messages indexes
CREATE INDEX IF NOT EXISTS idx_messages_match_id ON public.messages (match_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages (sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages (created_at);

-- Points log indexes
CREATE INDEX IF NOT EXISTS idx_points_log_user_id ON public.points_log (user_id);
CREATE INDEX IF NOT EXISTS idx_points_log_activity_type ON public.points_log (activity_type);
CREATE INDEX IF NOT EXISTS idx_points_log_created_at ON public.points_log (created_at);

-- ============================================
-- Functions
-- ============================================

-- Function to check if two users are compatible based on their match_settings
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
    distance_km := ST_Distance(
      user1_record.location,
      user2_record.location
    ) / 1000.0;

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

  RETURN TRUE;
END;
$$;

-- Function to get user location coordinates as lat/lon
CREATE OR REPLACE FUNCTION get_user_location_coords(user_id UUID)
RETURNS TABLE (lat NUMERIC, lon NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ST_Y(location::geometry)::NUMERIC as lat,
    ST_X(location::geometry)::NUMERIC as lon
  FROM public.users
  WHERE id = user_id;
END;
$$;

-- Function to refresh compatibility cache for a specific user
CREATE OR REPLACE FUNCTION refresh_user_compatibility_cache(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY user_compatibility_cache;
END;
$$;

-- ============================================
-- Materialized Views
-- ============================================

-- Pre-computed compatible user pairs
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

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_compatibility_cache
ON user_compatibility_cache (user1_id, user2_id);

-- ============================================
-- Row Level Security (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.swipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.points_log ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Users RLS Policies
-- ============================================
-- Authenticated users can read all user profiles
CREATE POLICY "users_select_all" ON public.users
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Users can update their own profile
CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Users can insert their own profile (via trigger from auth)
CREATE POLICY "users_insert_own" ON public.users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================
-- Deals RLS Policies
-- ============================================
-- Anyone can read active deals
CREATE POLICY "deals_select_active" ON public.deals
  FOR SELECT
  USING (is_active = true);

-- Users can create deals
CREATE POLICY "deals_insert_own" ON public.deals
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Users can update their own deals
CREATE POLICY "deals_update_own" ON public.deals
  FOR UPDATE
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- ============================================
-- Deal Images RLS Policies
-- ============================================
-- Anyone can read deal images for active deals
CREATE POLICY "deal_images_select" ON public.deal_images
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.deals
    WHERE deals.id = deal_images.deal_id AND deals.is_active = true
  ));

-- Users can insert images for their own deals
CREATE POLICY "deal_images_insert" ON public.deal_images
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.deals
    WHERE deals.id = deal_images.deal_id AND deals.created_by = auth.uid()
  ));

-- ============================================
-- Swipes RLS Policies
-- ============================================
-- Users can read their own swipes
CREATE POLICY "swipes_select_own" ON public.swipes
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own swipes
CREATE POLICY "swipes_insert_own" ON public.swipes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- Matches RLS Policies
-- ============================================
-- Users can read matches they're part of
CREATE POLICY "matches_select_own" ON public.matches
  FOR SELECT
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- System can insert matches (via function/trigger)
CREATE POLICY "matches_insert_service" ON public.matches
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role' OR auth.role() = 'authenticated');

-- ============================================
-- Messages RLS Policies
-- ============================================
-- Users can read messages from their matches
CREATE POLICY "messages_select_own_matches" ON public.messages
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.matches
    WHERE matches.id = messages.match_id
    AND (matches.user1_id = auth.uid() OR matches.user2_id = auth.uid())
  ));

-- Users can insert messages to their matches
CREATE POLICY "messages_insert_own_matches" ON public.messages
  FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND EXISTS (
      SELECT 1 FROM public.matches
      WHERE matches.id = messages.match_id
      AND (matches.user1_id = auth.uid() OR matches.user2_id = auth.uid())
    )
  );

-- ============================================
-- Points Log RLS Policies
-- ============================================
-- Users can read their own points log
CREATE POLICY "points_log_select_own" ON public.points_log
  FOR SELECT
  USING (auth.uid() = user_id);

-- System can insert points (via function)
CREATE POLICY "points_log_insert_service" ON public.points_log
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role' OR auth.role() = 'authenticated');

-- ============================================
-- Grants for Data API Access
-- ============================================

-- Grants for anon (unauthenticated) role
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON public.deals TO anon;
GRANT SELECT ON public.deal_images TO anon;

-- Grants for authenticated role
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;
GRANT SELECT, INSERT ON public.deals TO authenticated;
GRANT SELECT, INSERT ON public.deal_images TO authenticated;
GRANT SELECT, INSERT ON public.swipes TO authenticated;
GRANT SELECT, INSERT ON public.matches TO authenticated;
GRANT SELECT, INSERT ON public.messages TO authenticated;
GRANT SELECT, INSERT ON public.points_log TO authenticated;

-- Grants for functions
GRANT EXECUTE ON FUNCTION check_user_compatibility TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_location_coords TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_user_compatibility_cache TO authenticated;

-- Grants for service_role (backend operations)
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
