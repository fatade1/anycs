-- ==========================================================================
-- NCSYF HOTFIX: AUTHORIZE ADMIN DIRECTORY & ROSTER VISIBILITY
-- Nigeria Civil Service Youths' Forum (NCSYF)
-- ==========================================================================
-- Run this in your Supabase SQL Editor (SQL Editor -> New Query -> Run)
-- to grant your administrator account full access to the member directory
-- and display all registered members in the Admin Dashboard.
-- ==========================================================================

-- 1. PROVISION ADMINISTRATOR ACCOUNTS IN PUBLIC.ADMIN_USERS
-- Safely activates or inserts Tolulope Fatade and Secretariat Super Admin without ID collisions
DO $$
BEGIN
    -- Ensure Tolulope Fatade is an active super administrator
    IF EXISTS (SELECT 1 FROM public.admin_users WHERE LOWER(email) = 'fatadetolulope@gmail.com') THEN
        UPDATE public.admin_users
        SET role = 'super_admin',
            role_label = 'Super Administrator',
            status = 'active'
        WHERE LOWER(email) = 'fatadetolulope@gmail.com';
    ELSE
        INSERT INTO public.admin_users (
            id, name, email, role, role_label, status
        ) VALUES (
            'ADM-TOLULOPE',
            'Tolulope Fatade',
            'fatadetolulope@gmail.com',
            'super_admin',
            'Super Administrator',
            'active'
        );
    END IF;

    -- Ensure Secretariat Super Admin is an active super administrator
    IF EXISTS (SELECT 1 FROM public.admin_users WHERE LOWER(email) = 'admin@ncsyf.com.ng') THEN
        UPDATE public.admin_users
        SET role = 'super_admin',
            role_label = 'Super Administrator',
            status = 'active'
        WHERE LOWER(email) = 'admin@ncsyf.com.ng';
    ELSE
        INSERT INTO public.admin_users (
            id, name, email, role, role_label, status
        ) VALUES (
            'ADM-001',
            'National Secretariat Super Admin',
            'admin@ncsyf.com.ng',
            'super_admin',
            'Super Administrator',
            'active'
        );
    END IF;
END $$;

-- 2. CREATE DEDICATED ADMIN ROSTER RPC FUNCTION
-- Provides the Admin Console with immediate, secure access to the full registered member roster
CREATE OR REPLACE FUNCTION public.get_all_member_profiles_admin()
RETURNS SETOF public.member_profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM public.member_profiles
    ORDER BY registered_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_all_member_profiles_admin() TO anon, authenticated;

-- 3. ENSURE ROW LEVEL SECURITY ALLOWS ACTIVE ADMINS FULL VIEW OF MEMBER PROFILES
DROP POLICY IF EXISTS "Members can view own profile" ON public.member_profiles;
CREATE POLICY "Members can view own profile"
    ON public.member_profiles FOR SELECT
    TO anon, authenticated
    USING (
        public.is_admin() OR
        (auth.uid() = user_id) OR
        (LOWER(auth.jwt()->>'email') = LOWER(email)) OR
        (auth.role() = 'service_role')
    );

-- 4. ENSURE ADMIN USERS CAN BE QUERIED BY AUTHENTICATED ADMINS
DROP POLICY IF EXISTS "Authorized admins can view admin personnel" ON public.admin_users;
CREATE POLICY "Authorized admins can view admin personnel"
    ON public.admin_users FOR SELECT
    TO authenticated, anon, service_role
    USING (true);
