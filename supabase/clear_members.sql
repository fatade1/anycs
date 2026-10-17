-- ==========================================================================
-- NCSYF SUPABASE: CLEAR ALL MEMBERS SCRIPT (FRESH START)
-- Nigeria Civil Service Youths' Forum (NCSYF)
-- ==========================================================================
-- Run this in your Supabase SQL Editor if you previously seeded members and
-- want to wipe them completely so the membership roster starts at 0.
--
-- This leaves your Administrator accounts, Thematic Projects, Circulars/Resources,
-- and Gallery Albums completely intact!
-- ==========================================================================

-- 1. Wipe all member profiles (CASCADE cleans up any dependent references)
TRUNCATE TABLE public.member_profiles CASCADE;

-- 2. Optional: If any auth accounts were created under Supabase auth.users for members:
-- Note: Super Admin email 'admin@ncsyf.com.ng' is preserved!
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
    DELETE FROM auth.users 
    WHERE email NOT IN ('admin@ncsyf.com.ng');
  END IF;
END $$;

-- 3. Verify that member_profiles is now empty
SELECT count(*) AS total_remaining_members FROM public.member_profiles;
