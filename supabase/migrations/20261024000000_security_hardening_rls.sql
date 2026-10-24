-- ==========================================================================
-- NCSYF SUPABASE MIGRATION: COMPLETE PRE-DEPLOYMENT SECURITY HARDENING & RLS
-- Migration ID: 20261024000000_security_hardening_rls.sql
-- ==========================================================================
-- This migration remediates critical security vulnerabilities:
-- 1. Eliminates public/anonymous dumping of member personal data (NDPA 2023 compliance).
-- 2. Restricts member profile reading strictly to the authenticated owner and verified admins.
-- 3. Forbids unauthorized member deletions (removes open DELETE policies).
-- 4. Prevents self-elevation or tampering with status, member_id, user_id, or category.
-- 5. Implements server-side administrative access control (is_admin / is_super_admin).
-- 6. Restricts admin_users table management to super administrators only.
-- 7. Secures private member KYC storage buckets from unauthorized client access.
-- ==========================================================================

-- 1. ADMINISTRATIVE ACCESS CONTROL FUNCTIONS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        auth.role() = 'service_role' OR
        EXISTS (
            SELECT 1 FROM public.admin_users
            WHERE LOWER(email) = LOWER(auth.jwt()->>'email')
              AND status = 'active'
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        auth.role() = 'service_role' OR
        EXISTS (
            SELECT 1 FROM public.admin_users
            WHERE LOWER(email) = LOWER(auth.jwt()->>'email')
              AND role = 'super_admin'
              AND status = 'active'
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 2. SECURE MEMBER IDENTIFIER LOOKUP (MINIMAL SURFACE)
-- Allows sign-in by Membership ID without granting table-wide SELECT on member_profiles
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

    -- 2. Normalized match on member_id (ignoring hyphens, slashes, spaces)
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

-- 3. SECURE DOWNLOAD COUNTER INCREMENT
CREATE OR REPLACE FUNCTION public.increment_resource_downloads(p_resource_id TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE public.resources
    SET downloads = downloads + 1, updated_at = now()
    WHERE id = p_resource_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.increment_resource_downloads(TEXT) TO anon, authenticated;

-- 4. HARDEN SENSITIVE FIELD PROTECTION TRIGGER
CREATE OR REPLACE FUNCTION public.protect_member_sensitive_fields()
RETURNS TRIGGER AS $$
BEGIN
    -- If user is NOT an active admin or service role, forbid altering sensitive fields
    IF NOT (public.is_admin() OR auth.role() = 'service_role') THEN
        IF (NEW.member_id IS DISTINCT FROM OLD.member_id) THEN
            RAISE EXCEPTION 'Access Denied: Member ID cannot be modified by member.';
        END IF;
        -- Allow linking user_id to auth.uid() if OLD.user_id was null or if authenticated user owns the email
        IF (NEW.user_id IS DISTINCT FROM OLD.user_id) THEN
            IF NOT (NEW.user_id = auth.uid() AND (OLD.user_id IS NULL OR LOWER(auth.jwt()->>'email') = LOWER(OLD.email))) THEN
                RAISE EXCEPTION 'Access Denied: User identity linkage cannot be changed.';
            END IF;
        END IF;
        IF (NEW.status IS DISTINCT FROM OLD.status) THEN
            RAISE EXCEPTION 'Access Denied: Membership verification status can only be modified by the Secretariat.';
        END IF;
        IF (NEW.category IS DISTINCT FROM OLD.category) THEN
            RAISE EXCEPTION 'Access Denied: Membership category cannot be changed directly.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_protect_member_sensitive_fields ON public.member_profiles;
CREATE TRIGGER trigger_protect_member_sensitive_fields
    BEFORE UPDATE ON public.member_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_member_sensitive_fields();

-- 5. ROW LEVEL SECURITY (RLS) FOR MEMBER PROFILES (PUBLIC.MEMBER_PROFILES)
ALTER TABLE public.member_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view members" ON public.member_profiles;
DROP POLICY IF EXISTS "Public can verify member validity" ON public.member_profiles;
DROP POLICY IF EXISTS "Members can view own profile" ON public.member_profiles;
CREATE POLICY "Members can view own profile"
    ON public.member_profiles FOR SELECT
    TO anon, authenticated
    USING (
        (auth.uid() = user_id) OR
        (LOWER(auth.jwt()->>'email') = LOWER(email)) OR
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
        (LOWER(auth.jwt()->>'email') = LOWER(email)) OR
        public.is_admin() OR
        (auth.role() = 'service_role')
    )
    WITH CHECK (
        (auth.uid() = user_id) OR
        (LOWER(auth.jwt()->>'email') = LOWER(email)) OR
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

DROP POLICY IF EXISTS "Service role has full management access" ON public.member_profiles;
CREATE POLICY "Service role has full management access"
    ON public.member_profiles FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- 6. ROW LEVEL SECURITY FOR ADMINISTRATIVE USERS (PUBLIC.ADMIN_USERS)
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view and manage admin accounts" ON public.admin_users;
DROP POLICY IF EXISTS "Authorized admins can view admin personnel" ON public.admin_users;
CREATE POLICY "Authorized admins can view admin personnel"
    ON public.admin_users FOR SELECT
    TO authenticated, service_role
    USING (
        public.is_admin() OR
        (auth.role() = 'service_role')
    );

DROP POLICY IF EXISTS "Super administrators can manage admin accounts" ON public.admin_users;
CREATE POLICY "Super administrators can manage admin accounts"
    ON public.admin_users FOR ALL
    TO authenticated, service_role
    USING (
        public.is_super_admin() OR
        (auth.role() = 'service_role')
    )
    WITH CHECK (
        public.is_super_admin() OR
        (auth.role() = 'service_role')
    );

-- 7. ROW LEVEL SECURITY FOR PROJECTS (PUBLIC.PROJECTS)
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view all projects" ON public.projects;
CREATE POLICY "Public can view all projects"
    ON public.projects FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Admins can manage projects" ON public.projects;
CREATE POLICY "Admins can manage projects"
    ON public.projects FOR ALL
    TO authenticated, service_role
    USING (public.is_admin() OR auth.role() = 'service_role')
    WITH CHECK (public.is_admin() OR auth.role() = 'service_role');

-- 8. ROW LEVEL SECURITY FOR RESOURCES (PUBLIC.RESOURCES)
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view all resources" ON public.resources;
CREATE POLICY "Public can view all resources"
    ON public.resources FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Public can increment resource download count" ON public.resources;

DROP POLICY IF EXISTS "Admins can manage resources" ON public.resources;
CREATE POLICY "Admins can manage resources"
    ON public.resources FOR ALL
    TO authenticated, service_role
    USING (public.is_admin() OR auth.role() = 'service_role')
    WITH CHECK (public.is_admin() OR auth.role() = 'service_role');

-- 9. ROW LEVEL SECURITY FOR GALLERY ALBUMS (PUBLIC.GALLERY_ALBUMS)
ALTER TABLE public.gallery_albums ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view all gallery albums" ON public.gallery_albums;
CREATE POLICY "Public can view all gallery albums"
    ON public.gallery_albums FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Admins can manage gallery albums" ON public.gallery_albums;
CREATE POLICY "Admins can manage gallery albums"
    ON public.gallery_albums FOR ALL
    TO authenticated, service_role
    USING (public.is_admin() OR auth.role() = 'service_role')
    WITH CHECK (public.is_admin() OR auth.role() = 'service_role');

-- 10. STORAGE BUCKET POLICIES (STORAGE.OBJECTS)
DROP POLICY IF EXISTS "Admins have full access to storage buckets" ON storage.objects;
DROP POLICY IF EXISTS "Only administrators can read member verification documents" ON storage.objects;
CREATE POLICY "Only administrators can read member verification documents"
    ON storage.objects FOR SELECT
    TO authenticated, service_role
    USING (
        bucket_id = 'member-documents' AND
        (public.is_admin() OR auth.role() = 'service_role')
    );

DROP POLICY IF EXISTS "Only administrators can modify member documents" ON storage.objects;
CREATE POLICY "Only administrators can modify member documents"
    ON storage.objects FOR UPDATE
    TO authenticated, service_role
    USING (
        bucket_id = 'member-documents' AND
        (public.is_admin() OR auth.role() = 'service_role')
    );

DROP POLICY IF EXISTS "Only administrators can delete member documents" ON storage.objects;
CREATE POLICY "Only administrators can delete member documents"
    ON storage.objects FOR DELETE
    TO authenticated, service_role
    USING (
        bucket_id = 'member-documents' AND
        (public.is_admin() OR auth.role() = 'service_role')
    );

DROP POLICY IF EXISTS "Admins can manage public storage buckets" ON storage.objects;
CREATE POLICY "Admins can manage public storage buckets"
    ON storage.objects FOR ALL
    TO authenticated, service_role
    USING (
        bucket_id IN ('resource-circulars', 'gallery-media') AND
        (public.is_admin() OR auth.role() = 'service_role')
    )
    WITH CHECK (
        bucket_id IN ('resource-circulars', 'gallery-media') AND
        (public.is_admin() OR auth.role() = 'service_role')
    );
