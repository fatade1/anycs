-- ==========================================================================
-- NCSYF HOTFIX: ENHANCED MEMBER ID RESOLUTION & PROFILE LINKING
-- Nigeria Civil Service Youths' Forum (NCSYF)
-- ==========================================================================
-- Run this in your Supabase SQL Editor (SQL Editor -> New Query -> Run)
-- to allow instant member sign-in using ANY variation of Member ID
-- (exact, lowercase, without hyphens, or via Staff ID).
-- ==========================================================================

-- 1. UPGRADE RESOLVE_MEMBER_LOGIN_EMAIL FUNCTION
CREATE OR REPLACE FUNCTION public.resolve_member_login_email(p_member_id TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    found_email TEXT;
    clean_id TEXT;
    norm_id TEXT;
BEGIN
    IF p_member_id IS NULL OR TRIM(p_member_id) = '' THEN
        RETURN NULL;
    END IF;

    clean_id := UPPER(TRIM(p_member_id));
    norm_id := REGEXP_REPLACE(clean_id, '[^A-Z0-9]', '', 'g');

    -- 1. Exact match on member_id (trimmed, case-insensitive)
    SELECT email INTO found_email
    FROM public.member_profiles
    WHERE UPPER(TRIM(member_id)) = clean_id
    LIMIT 1;

    -- 2. Normalized match on member_id (ignoring hyphens, slashes, spaces: e.g. NCSYF19950001)
    IF found_email IS NULL THEN
        SELECT email INTO found_email
        FROM public.member_profiles
        WHERE REGEXP_REPLACE(UPPER(TRIM(member_id)), '[^A-Z0-9]', '', 'g') = norm_id
        LIMIT 1;
    END IF;

    -- 3. Match on staff_id (exact or normalized)
    IF found_email IS NULL THEN
        SELECT email INTO found_email
        FROM public.member_profiles
        WHERE UPPER(TRIM(staff_id)) = clean_id
           OR REGEXP_REPLACE(UPPER(TRIM(staff_id)), '[^A-Z0-9]', '', 'g') = norm_id
        LIMIT 1;
    END IF;

    -- 4. Suffix match (e.g. user entered "2026-0001" without "NCSYF-")
    IF found_email IS NULL AND LENGTH(clean_id) >= 6 THEN
        SELECT email INTO found_email
        FROM public.member_profiles
        WHERE UPPER(TRIM(member_id)) LIKE '%' || clean_id
        LIMIT 1;
    END IF;

    RETURN found_email;
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_member_login_email(TEXT) TO anon, authenticated;

-- 2. BACKFILL PROFILES FOR EXISTING AUTH USERS MISSING FROM MEMBER_PROFILES
-- Ensures any account registered in Supabase Auth has an active Member ID in member_profiles
INSERT INTO public.member_profiles (
    user_id,
    email,
    member_id,
    first_name,
    last_name,
    category,
    tier,
    tier_label,
    mda,
    state_chapter,
    status,
    registered_at
)
SELECT 
    u.id AS user_id,
    LOWER(u.email) AS email,
    'NCSYF-' || TO_CHAR(COALESCE(u.created_at, now()), 'YYYY') || '-' || LPAD((ROW_NUMBER() OVER (ORDER BY u.created_at) + 10)::TEXT, 4, '0') AS member_id,
    COALESCE(NULLIF(u.raw_user_meta_data->>'first_name', ''), split_part(u.email, '@', 1)) AS first_name,
    COALESCE(NULLIF(u.raw_user_meta_data->>'last_name', ''), 'Member') AS last_name,
    'full'::member_category_type AS category,
    'federal' AS tier,
    'Federal Government MDA' AS tier_label,
    'Federal Public Service' AS mda,
    'FCT Abuja' AS state_chapter,
    'verified'::member_status_type AS status,
    COALESCE(u.created_at, now()) AS registered_at
FROM auth.users u
WHERE NOT EXISTS (
    SELECT 1 FROM public.member_profiles mp 
    WHERE mp.user_id = u.id OR LOWER(mp.email) = LOWER(u.email)
)
ON CONFLICT (member_id) DO NOTHING;

-- 3. LINK ANY PROFILES MATCHING BY EMAIL WHERE USER_ID IS STILL NULL
UPDATE public.member_profiles mp
SET user_id = u.id
FROM auth.users u
WHERE LOWER(mp.email) = LOWER(u.email)
  AND mp.user_id IS NULL;
