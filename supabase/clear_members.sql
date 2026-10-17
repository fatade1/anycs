-- ==========================================================================
-- NCSYF SUPABASE: CLEAR ALL MEMBERS & PERMISSIONS SCRIPT (FRESH START)
-- Nigeria Civil Service Youths' Forum (NCSYF)
-- ==========================================================================
-- Run this in your Supabase SQL Editor to wipe existing members and ensure
-- all portal permissions (registration, admin verification, fresh start)
-- are 100% active and unblocked.
-- ==========================================================================

-- 1. Wipe all member profiles (CASCADE cleans up any dependent references)
TRUNCATE TABLE public.member_profiles CASCADE;

-- 2. Ensure RLS policies allow registration submissions and Secretariat management
ALTER TABLE public.member_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can verify member validity" ON public.member_profiles;
DROP POLICY IF EXISTS "Members can view own profile" ON public.member_profiles;
DROP POLICY IF EXISTS "Public can view members" ON public.member_profiles;
CREATE POLICY "Public can view members"
    ON public.member_profiles FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Applicants can submit registration profiles" ON public.member_profiles;
CREATE POLICY "Applicants can submit registration profiles"
    ON public.member_profiles FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "Members can update permitted own profile fields" ON public.member_profiles;
DROP POLICY IF EXISTS "Permit member and admin updates" ON public.member_profiles;
CREATE POLICY "Permit member and admin updates"
    ON public.member_profiles FOR UPDATE
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Permit member deletions" ON public.member_profiles;
CREATE POLICY "Permit member deletions"
    ON public.member_profiles FOR DELETE
    TO anon, authenticated
    USING (true);

-- 3. Verify that member_profiles is empty and ready
SELECT count(*) AS total_remaining_members FROM public.member_profiles;
