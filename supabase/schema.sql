-- ============================================================================
-- LUNAROV MISSION CONTROL - SUPABASE DATABASE SCHEMA (PRODUCTION DDL)
-- Role: Senior Database Administrator
-- ============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLE: public.profiles
-- Linked to Supabase auth.users for secure astronaut profile management
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  avatar_seed TEXT,
  role TEXT DEFAULT 'MISSION_SPECIALIST',
  missions_completed INT DEFAULT 0,
  last_login TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast user lookup by email
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Public profiles are viewable by authenticated users" 
  ON public.profiles FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Users can insert their own profile" 
  ON public.profiles FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
  ON public.profiles FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = id);

-- 3. TABLE: public.saved_missions
-- Stores comprehensive lunar exploration telemetry and navigation mission records
CREATE TABLE IF NOT EXISTS public.saved_missions (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  name TEXT NOT NULL,
  date TEXT NOT NULL,
  terrain_type TEXT NOT NULL,
  algorithm TEXT NOT NULL,
  start_x INT NOT NULL,
  start_y INT NOT NULL,
  target_x INT NOT NULL,
  target_y INT NOT NULL,
  rover_name TEXT NOT NULL,
  duration_seconds NUMERIC(8, 2) NOT NULL,
  distance_meters NUMERIC(8, 2) NOT NULL,
  energy_consumed_wh NUMERIC(8, 2) NOT NULL,
  efficiency_score INT NOT NULL,
  outcome TEXT NOT NULL,
  average_speed_mps NUMERIC(6, 2),
  max_slope_deg NUMERIC(5, 2),
  reroute_count INT DEFAULT 0,
  telemetry_summary JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for missions performance
CREATE INDEX IF NOT EXISTS idx_saved_missions_user_id ON public.saved_missions(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_missions_created_at ON public.saved_missions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_saved_missions_terrain ON public.saved_missions(terrain_type);

-- Enable RLS on saved_missions
ALTER TABLE public.saved_missions ENABLE ROW LEVEL SECURITY;

-- Saved Missions Policies: Users can view and manage their own mission telemetry
CREATE POLICY "Users can select their own missions" 
  ON public.saved_missions FOR SELECT 
  TO authenticated 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own missions" 
  ON public.saved_missions FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own missions" 
  ON public.saved_missions FOR DELETE 
  TO authenticated 
  USING (auth.uid() = user_id);

-- 4. TABLE: public.user_preferences
-- Maintains user rover specs, view configurations, and sound settings across devices
CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  rover_config JSONB NOT NULL,
  graphics_quality TEXT DEFAULT 'HIGH',
  sound_enabled BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on user_preferences
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own preferences" 
  ON public.user_preferences FOR ALL 
  TO authenticated 
  USING (auth.uid() = user_id);

-- 5. AUTOMATIC PROFILE CREATION TRIGGER
-- Whenever a new user signs up in auth.users, create their astronaut profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_seed, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger definition
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
