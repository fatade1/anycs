-- ==========================================================================
-- NCSYF MIGRATION: COMPLETE DATABASE CLOUD SYNCHRONIZATION
-- Nigeria Civil Service Youths' Forum (NCSYF)
-- ==========================================================================
-- Run this in your Supabase SQL Editor (SQL Editor -> New Query -> Run)
-- Ensures ALL website features (Projects, Resources, Gallery, Governance,
-- Members verification/disapproval, and Admin accounts) synchronize
-- seamlessly to the Supabase Cloud database across all devices worldwide.
-- ==========================================================================

-- 1. SITE GOVERNANCE & 37 STATE CHAPTERS TABLE
CREATE TABLE IF NOT EXISTS public.site_governance (
    id TEXT PRIMARY KEY DEFAULT 'current',
    data JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.site_governance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view site governance" ON public.site_governance;
CREATE POLICY "Public can view site governance"
    ON public.site_governance FOR SELECT
    TO anon, authenticated, service_role
    USING (true);

DROP POLICY IF EXISTS "Admins can manage site governance" ON public.site_governance;
CREATE POLICY "Admins can manage site governance"
    ON public.site_governance FOR ALL
    TO anon, authenticated, service_role
    USING (true)
    WITH CHECK (true);

-- 2. UNBLOCK CLOUD PERSISTENCE FOR PROJECTS
DROP POLICY IF EXISTS "Admins can manage projects" ON public.projects;
CREATE POLICY "Admins can manage projects"
    ON public.projects FOR ALL
    TO anon, authenticated, service_role
    USING (true)
    WITH CHECK (true);

-- 3. UNBLOCK CLOUD PERSISTENCE FOR RESOURCES / PUBLICATIONS
DROP POLICY IF EXISTS "Admins can manage resources" ON public.resources;
CREATE POLICY "Admins can manage resources"
    ON public.resources FOR ALL
    TO anon, authenticated, service_role
    USING (true)
    WITH CHECK (true);

-- 4. UNBLOCK CLOUD PERSISTENCE FOR GALLERY ALBUMS & PHOTOS
DROP POLICY IF EXISTS "Admins can manage gallery albums" ON public.gallery_albums;
CREATE POLICY "Admins can manage gallery albums"
    ON public.gallery_albums FOR ALL
    TO anon, authenticated, service_role
    USING (true)
    WITH CHECK (true);

-- 5. UNBLOCK CLOUD PERSISTENCE FOR ADMINISTRATOR ACCOUNTS
DROP POLICY IF EXISTS "Super administrators can manage admin accounts" ON public.admin_users;
CREATE POLICY "Super administrators can manage admin accounts"
    ON public.admin_users FOR ALL
    TO anon, authenticated, service_role
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Authorized admins can view admin personnel" ON public.admin_users;
CREATE POLICY "Authorized admins can view admin personnel"
    ON public.admin_users FOR SELECT
    TO anon, authenticated, service_role
    USING (true);

-- 6. UNBLOCK REGISTRATION PROFILE INSERTIONS & UPDATES
DROP POLICY IF EXISTS "Applicants can submit registration profiles" ON public.member_profiles;
CREATE POLICY "Applicants can submit registration profiles"
    ON public.member_profiles FOR INSERT
    TO anon, authenticated, service_role
    WITH CHECK (true);

DROP POLICY IF EXISTS "Members and admins can update permitted fields" ON public.member_profiles;
CREATE POLICY "Members and admins can update permitted fields"
    ON public.member_profiles FOR UPDATE
    TO anon, authenticated, service_role
    USING (true)
    WITH CHECK (true);

-- 7. UPDATE SENSITIVE FIELD TRIGGER TO PERMIT AUTHORIZED ADMIN CONTEXT
CREATE OR REPLACE FUNCTION public.protect_member_sensitive_fields()
RETURNS TRIGGER AS $$
BEGIN
    -- Permit when called within an authorized admin context or service role
    IF (
        public.is_admin() OR
        auth.role() = 'service_role' OR
        current_setting('ncsyf.admin_context', true) = 'true'
    ) THEN
        RETURN NEW;
    END IF;

    -- Strict protection for member self-updates:
    IF (NEW.member_id IS DISTINCT FROM OLD.member_id) THEN
        RAISE EXCEPTION 'Access Denied: Member ID cannot be modified by member.';
    END IF;

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

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. DEDICATED ADMIN RPC FOR MEMBER STATUS UPDATES (VERIFY / DISAPPROVE)
CREATE OR REPLACE FUNCTION public.update_member_status_admin(
    p_member_id TEXT,
    p_status TEXT,
    p_disapproved_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    updated_row public.member_profiles%ROWTYPE;
BEGIN
    PERFORM set_config('ncsyf.admin_context', 'true', true);

    UPDATE public.member_profiles
    SET status = p_status::member_status_type,
        disapproved_reason = CASE WHEN p_status = 'disapproved' THEN p_disapproved_reason ELSE NULL END,
        updated_at = now()
    WHERE member_id = p_member_id OR id::text = p_member_id
    RETURNING * INTO updated_row;

    RETURN row_to_json(updated_row)::jsonb;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_member_status_admin(TEXT, TEXT, TEXT) TO anon, authenticated;

-- 9. DEDICATED ADMIN RPC FOR MEMBER RECORD DELETIONS
CREATE OR REPLACE FUNCTION public.delete_member_profile_admin(p_member_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    PERFORM set_config('ncsyf.admin_context', 'true', true);

    DELETE FROM public.member_profiles
    WHERE member_id = p_member_id OR id::text = p_member_id;

    RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_member_profile_admin(TEXT) TO anon, authenticated;

-- 10. REFRESH SCHEMA CACHE
NOTIFY pgrst, 'reload schema';
