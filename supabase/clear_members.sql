-- ==========================================================================
-- NCSYF SUPABASE: CLEAR ALL MEMBERS & PERMISSIONS SCRIPT (FRESH START)
-- Nigeria Civil Service Youths' Forum (NCSYF)
-- ==========================================================================
-- Run this in your Supabase SQL Editor to wipe existing members and ensure
-- all portal permissions (registration, admin verification, fresh start)
-- are 100% active, hardened, and protected by Row Level Security.
-- ==========================================================================

-- 1. Wipe all member profiles (CASCADE cleans up any dependent references)
TRUNCATE TABLE public.member_profiles CASCADE;

-- 2. Verify Row Level Security is strictly enabled
ALTER TABLE public.member_profiles ENABLE ROW LEVEL SECURITY;

-- 3. Ensure hardened policies are in place (No anonymous PII dumps or unprivileged deletions)
DROP POLICY IF EXISTS "Public can view members" ON public.member_profiles;
DROP POLICY IF EXISTS "Public can verify member validity" ON public.member_profiles;
DROP POLICY IF EXISTS "Members can view own profile" ON public.member_profiles;
CREATE POLICY "Members can view own profile"
    ON public.member_profiles FOR SELECT
    TO anon, authenticated
    USING (
        (auth.uid() = user_id) OR
        public.is_admin() OR
        (auth.role() = 'service_role')
    );

DROP POLICY IF EXISTS "Applicants can submit registration profiles" ON public.member_profiles;
CREATE POLICY "Applicants can submit registration profiles"
    ON public.member_profiles FOR INSERT
    TO anon, authenticated
    WITH CHECK (
        (status = 'pending') AND
        (user_id IS NULL OR user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Permit member and admin updates" ON public.member_profiles;
DROP POLICY IF EXISTS "Members can update permitted own profile fields" ON public.member_profiles;
DROP POLICY IF EXISTS "Members and admins can update permitted fields" ON public.member_profiles;
CREATE POLICY "Members and admins can update permitted fields"
    ON public.member_profiles FOR UPDATE
    TO anon, authenticated
    USING (
        (auth.uid() = user_id) OR
        public.is_admin() OR
        (auth.role() = 'service_role')
    )
    WITH CHECK (
        (auth.uid() = user_id) OR
        public.is_admin() OR
        (auth.role() = 'service_role')
    );

DROP POLICY IF EXISTS "Permit member deletions" ON public.member_profiles;
DROP POLICY IF EXISTS "Only authorized administrators can delete members" ON public.member_profiles;
CREATE POLICY "Only authorized administrators can delete members"
    ON public.member_profiles FOR DELETE
    TO authenticated, service_role
    USING (
        public.is_admin() OR
        (auth.role() = 'service_role')
    );

-- 4. Verify that member_profiles is empty and ready
SELECT count(*) AS total_remaining_members FROM public.member_profiles;
