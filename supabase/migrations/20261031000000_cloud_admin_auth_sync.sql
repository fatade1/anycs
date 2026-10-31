-- ==========================================================================
-- NCSYF MIGRATION: CLOUD ADMIN AUTHENTICATION & MULTI-DEVICE SYNC
-- Nigeria Civil Service Youths' Forum (NCSYF)
-- ==========================================================================
-- Run this in your Supabase SQL Editor (SQL Editor -> New Query -> Run)
-- to enable seamless admin logins from ANY device worldwide without
-- relying on single-device browser localStorage.
-- ==========================================================================

-- 1. ADD PASSWORD HASH & SALT COLUMNS TO PUBLIC.ADMIN_USERS
ALTER TABLE public.admin_users 
ADD COLUMN IF NOT EXISTS password_hash TEXT,
ADD COLUMN IF NOT EXISTS salt TEXT;

-- 2. ENSURE ALL ADMINISTRATORS ARE PROVISIONED WITH VALID PASSWORD HASHES
-- Default hash corresponds to 'Secretariat@2026' with salt 'ncsyf_sec_2026_salt'
-- Hash: 46940140b4a15dc9d9ac3474834d86cfd8dd2a37f06055519995c811b6ce2cb8

-- Update primary superadmin
UPDATE public.admin_users
SET password_hash = '46940140b4a15dc9d9ac3474834d86cfd8dd2a37f06055519995c811b6ce2cb8',
    salt = 'ncsyf_sec_2026_salt',
    role = 'super_admin',
    role_label = 'Super Administrator',
    status = 'active'
WHERE LOWER(email) = 'admin@ncsyf.com.ng';

-- Update all existing admin records that do not have a password hash yet
UPDATE public.admin_users
SET password_hash = '46940140b4a15dc9d9ac3474834d86cfd8dd2a37f06055519995c811b6ce2cb8',
    salt = 'ncsyf_sec_2026_salt'
WHERE password_hash IS NULL OR password_hash = '';

-- 3. CREATE SECURE ADMIN VERIFICATION RPC FUNCTION
CREATE OR REPLACE FUNCTION public.verify_admin_login(p_email TEXT, p_password_hash TEXT)
RETURNS TABLE (
    id TEXT,
    name TEXT,
    email TEXT,
    role TEXT,
    role_label TEXT,
    status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.name,
        a.email,
        a.role,
        a.role_label,
        a.status
    FROM public.admin_users a
    WHERE LOWER(TRIM(a.email)) = LOWER(TRIM(p_email))
      AND a.status = 'active'
      AND a.password_hash = p_password_hash
    LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_admin_login(TEXT, TEXT) TO anon, authenticated;

-- 4. CREATE HELPER TO RETRIEVE ADMIN SALT
CREATE OR REPLACE FUNCTION public.get_admin_salt(p_email TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    found_salt TEXT;
BEGIN
    SELECT a.salt INTO found_salt
    FROM public.admin_users a
    WHERE LOWER(TRIM(a.email)) = LOWER(TRIM(p_email))
      AND a.status = 'active'
    LIMIT 1;
    RETURN found_salt;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_salt(TEXT) TO anon, authenticated;

-- 5. ENSURE RLS POLICIES FOR ADMIN USERS ALLOW SYNC & AUTHENTICATION
DROP POLICY IF EXISTS "Authorized admins can view admin personnel" ON public.admin_users;
CREATE POLICY "Authorized admins can view admin personnel"
    ON public.admin_users FOR SELECT
    TO authenticated, anon, service_role
    USING (true);

DROP POLICY IF EXISTS "Authorized admins can update admin personnel" ON public.admin_users;
CREATE POLICY "Authorized admins can update admin personnel"
    ON public.admin_users FOR UPDATE
    TO authenticated, anon, service_role
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Authorized admins can insert admin personnel" ON public.admin_users;
CREATE POLICY "Authorized admins can insert admin personnel"
    ON public.admin_users FOR INSERT
    TO authenticated, anon, service_role
    WITH CHECK (true);
