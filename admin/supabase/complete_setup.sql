-- ==========================================================================
-- NIGERIA CIVIL SERVICE YOUTHS' FORUM (NCSYF)
-- COMPLETE SUPABASE DATABASE SETUP & CLOUD STORAGE INITIALIZATION
-- ==========================================================================
-- Instructions:
-- 1. Open your Supabase Project Dashboard (https://app.supabase.com)
-- 2. Click "SQL Editor" in the left sidebar
-- 3. Click "New query", paste the entire contents of this file, and click "Run"
-- 4. All tables, security triggers, Row Level Security (RLS) policies, storage buckets,
--    and initial records will be created instantly and idempotently.
-- ==========================================================================

-- Enable pgcrypto for UUID and cryptographic functions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==========================================================================
-- 1. ENUMS & SHARED TRIGGER FUNCTIONS
-- ==========================================================================
DO $$ BEGIN
    CREATE TYPE member_category_type AS ENUM ('full', 'associate');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE member_status_type AS ENUM ('pending', 'verified', 'disapproved', 'suspended');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==========================================================================
-- 2. ADMINISTRATIVE PERSONNEL TABLE (PUBLIC.ADMIN_USERS)
-- ==========================================================================
CREATE TABLE IF NOT EXISTS public.admin_users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin',
    role_label TEXT DEFAULT 'Administrator',
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_users_email ON public.admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON public.admin_users(role);

DROP TRIGGER IF EXISTS trigger_admin_users_updated_at ON public.admin_users;
CREATE TRIGGER trigger_admin_users_updated_at
    BEFORE UPDATE ON public.admin_users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ==========================================================================
-- 3. ADMINISTRATIVE ACCESS CONTROL FUNCTIONS & SECURE RPCs
-- ==========================================================================
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

-- Secure member login email lookup:
-- Allows member sign-in by Membership ID without granting table-wide SELECT on member_profiles
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

-- Secure download counter increment:
-- Allows atomic download counter bumps without granting table-wide UPDATE on resources
CREATE OR REPLACE FUNCTION public.increment_resource_downloads(p_resource_id TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE public.resources
    SET downloads = downloads + 1, updated_at = now()
    WHERE id = p_resource_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.increment_resource_downloads(TEXT) TO anon, authenticated;

-- ==========================================================================
-- 4. ROW LEVEL SECURITY FOR ADMINISTRATIVE PERSONNEL
-- ==========================================================================
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

-- ==========================================================================
-- 5. MEMBER PROFILES TABLE (PUBLIC.MEMBER_PROFILES)
-- ==========================================================================
CREATE TABLE IF NOT EXISTS public.member_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    member_id TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    category member_category_type NOT NULL DEFAULT 'full',
    member_type_label TEXT,
    dob DATE,
    age INTEGER,
    gender TEXT,
    phone TEXT,
    tier TEXT DEFAULT 'federal',
    tier_label TEXT DEFAULT 'Federal Government MDA',
    mda TEXT NOT NULL,
    state_chapter TEXT NOT NULL,
    staff_id TEXT,
    doc_type TEXT,
    doc_type_label TEXT,
    status member_status_type NOT NULL DEFAULT 'pending',
    disapproved_reason TEXT,
    reapplied_at TIMESTAMPTZ,
    registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_member_profiles_user_id ON public.member_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_member_profiles_member_id ON public.member_profiles(member_id);
CREATE INDEX IF NOT EXISTS idx_member_profiles_email ON public.member_profiles(email);
CREATE INDEX IF NOT EXISTS idx_member_profiles_status ON public.member_profiles(status);
CREATE INDEX IF NOT EXISTS idx_member_profiles_mda ON public.member_profiles(mda);

DROP TRIGGER IF EXISTS trigger_member_profiles_updated_at ON public.member_profiles;
CREATE TRIGGER trigger_member_profiles_updated_at
    BEFORE UPDATE ON public.member_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Prevent members from self-verifying or elevating permissions
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

-- Auto-link member profile when a user registers via auth.users
CREATE OR REPLACE FUNCTION public.handle_auth_user_created()
RETURNS TRIGGER AS $$
DECLARE
    matched_profile_id UUID;
BEGIN
    SELECT id INTO matched_profile_id
    FROM public.member_profiles
    WHERE LOWER(email) = LOWER(NEW.email) AND user_id IS NULL
    LIMIT 1;

    IF matched_profile_id IS NOT NULL THEN
        UPDATE public.member_profiles
        SET user_id = NEW.id, updated_at = now()
        WHERE id = matched_profile_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_on_auth_user_created ON auth.users;
CREATE TRIGGER trigger_on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_auth_user_created();

-- Row Level Security (RLS) for Member Profiles (Hardened for NDPA 2023 Compliance)
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

-- ==========================================================================
-- 6. PUBLIC INITIATIVES & PROJECTS TABLE (PUBLIC.PROJECTS)
-- ==========================================================================
CREATE TABLE IF NOT EXISTS public.projects (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    sector TEXT NOT NULL,
    lead_mda TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    status_label TEXT DEFAULT 'Active Implementation',
    target_beneficiaries TEXT,
    budget TEXT,
    description TEXT,
    images JSONB DEFAULT '[]'::jsonb,
    date_added DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_projects_sector ON public.projects(sector);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);

DROP TRIGGER IF EXISTS trigger_projects_updated_at ON public.projects;
CREATE TRIGGER trigger_projects_updated_at
    BEFORE UPDATE ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

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

-- ==========================================================================
-- 7. OFFICIAL CIRCULARS & RESOURCES TABLE (PUBLIC.RESOURCES)
-- ==========================================================================
CREATE TABLE IF NOT EXISTS public.resources (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    publishing_mda TEXT NOT NULL,
    file_type TEXT NOT NULL DEFAULT 'PDF',
    file_size TEXT DEFAULT '1.0 MB',
    file_url TEXT DEFAULT '#',
    downloads INTEGER NOT NULL DEFAULT 0,
    description TEXT,
    date_added DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_resources_category ON public.resources(category);
CREATE INDEX IF NOT EXISTS idx_resources_publishing_mda ON public.resources(publishing_mda);

DROP TRIGGER IF EXISTS trigger_resources_updated_at ON public.resources;
CREATE TRIGGER trigger_resources_updated_at
    BEFORE UPDATE ON public.resources
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

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

-- ==========================================================================
-- 8. MEDIA GALLERY & PHOTO ALBUMS TABLE (PUBLIC.GALLERY_ALBUMS)
-- ==========================================================================
CREATE TABLE IF NOT EXISTS public.gallery_albums (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    location TEXT,
    date DATE,
    description TEXT,
    images JSONB DEFAULT '[]'::jsonb,
    cover_image TEXT,
    date_added DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gallery_category ON public.gallery_albums(category);
CREATE INDEX IF NOT EXISTS idx_gallery_date ON public.gallery_albums(date);

DROP TRIGGER IF EXISTS trigger_gallery_updated_at ON public.gallery_albums;
CREATE TRIGGER trigger_gallery_updated_at
    BEFORE UPDATE ON public.gallery_albums
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

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

-- ==========================================================================
-- 9. SUPABASE STORAGE BUCKETS SETUP & HARDENED OBJECT POLICIES
-- ==========================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('member-documents', 'member-documents', false),
    ('resource-circulars', 'resource-circulars', true),
    ('gallery-media', 'gallery-media', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- Storage object policies
DROP POLICY IF EXISTS "Public can view resource circulars" ON storage.objects;
CREATE POLICY "Public can view resource circulars"
    ON storage.objects FOR SELECT
    TO anon, authenticated
    USING (bucket_id = 'resource-circulars');

DROP POLICY IF EXISTS "Public can view gallery media" ON storage.objects;
CREATE POLICY "Public can view gallery media"
    ON storage.objects FOR SELECT
    TO anon, authenticated
    USING (bucket_id = 'gallery-media');

DROP POLICY IF EXISTS "Applicants and members can upload KYC verification documents" ON storage.objects;
CREATE POLICY "Applicants and members can upload KYC verification documents"
    ON storage.objects FOR INSERT
    TO anon, authenticated
    WITH CHECK (bucket_id = 'member-documents');

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

-- ==========================================================================
-- 10. COMPREHENSIVE INITIAL SEED DATA
-- ==========================================================================

-- Seed Projects
INSERT INTO public.projects (
    id, title, sector, lead_mda, status, status_label, target_beneficiaries, budget, description, images, date_added
) VALUES
(
    'PRJ-001',
    'Civil Service AI & Digital Paperless Workflow Pilot',
    'Technology & Innovation',
    'Federal Ministry of Communications, Innovation & Digital Economy / NITDA',
    'active',
    'Active Implementation',
    '15,000+ Young Public Servants',
    '₦85,000,000',
    'A nationwide transformation program training serving youths in MDAs on digital records management, workflow automation, and collaborative paperless administration.',
    '["images/project_digital_office.jpg", "images/african-youth-civil-servants.jpg"]'::jsonb,
    '2026-09-15'
),
(
    'PRJ-002',
    'Youth Agri-Tech Public Service Cluster (FMAFS)',
    'Agriculture & Food Security',
    'Federal Ministry of Agriculture & Food Security',
    'active',
    'Active Implementation',
    '36 State Chapters & FCT',
    '₦120,000,000',
    'Empowering young desk officers and agricultural extension public servants with satellite-guided crop monitoring and grain reserve logistics tracking systems.',
    '["images/project_agritech.jpg"]'::jsonb,
    '2026-09-20'
),
(
    'PRJ-003',
    'Primary Healthcare Electronic Registry & Service Delivery Track',
    'Healthcare & Social Welfare',
    'National Primary Health Care Development Agency (NPHCDA)',
    'planning',
    'Planning & Review',
    '774 LGAs Nationwide',
    '₦95,000,000',
    'Modernizing vaccine cold-chain reporting and primary healthcare center tracking by mobilizing LGA youth health officers.',
    '["images/project_healthcare.jpg"]'::jsonb,
    '2026-09-28'
),
(
    'PRJ-004',
    'Public Service Transparency & Procurement Integrity Dashboard',
    'Governance & Economy',
    'Bureau of Public Procurement (BPP)',
    'completed',
    'Successfully Concluded',
    'All Federal Procurement Units',
    '₦45,000,000',
    'Developed by NCSYF Tech Fellow cohorts to track competitive tenders and contract awards in full alignment with national open-contracting data standards.',
    '["images/project_digital_office.jpg"]'::jsonb,
    '2026-08-10'
)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    sector = EXCLUDED.sector,
    lead_mda = EXCLUDED.lead_mda,
    status = EXCLUDED.status,
    budget = EXCLUDED.budget;

-- Seed Resources & Circulars
INSERT INTO public.resources (
    id, title, category, publishing_mda, file_type, file_size, file_url, downloads, description, date_added
) VALUES
(
    'RES-001',
    'Revised Public Service Rules (PSR 2026 Edition)',
    'Official Circular',
    'Office of the Head of the Civil Service of the Federation (OHCSF)',
    'PDF',
    '4.8 MB',
    'docs/PSR_2026_Official_Compendium.pdf',
    1420,
    'The foundational regulatory framework governing tenure, promotion quotas, professional cadres, performance evaluation, and disciplinary codes across federal institutions.',
    '2026-09-10'
),
(
    'RES-002',
    'Federal Civil Service Digital Transformation Strategy (FCSSIP-25)',
    'Policy Framework',
    'Federal Ministry of Communications, Innovation & Digital Economy',
    'PDF',
    '3.2 MB',
    'docs/FCSSIP_25_Digital_Strategy.pdf',
    980,
    'The official five-year blueprint charting enterprise cloud migration, digital records retention, electronic file approvals, and capacity building for early-career public servants.',
    '2026-09-18'
),
(
    'RES-003',
    'Guidelines on Youth Innovators in Public Service (YIPS)',
    'Guidelines',
    'National Secretariat, NCSYF',
    'PDF',
    '1.6 MB',
    'docs/YIPS_Innovators_Operational_Handbook.pdf',
    754,
    'Operational playbook for establishing innovation sandboxes, cross-MDA project taskforces, and youth-led service redesign sprint teams in ministries and extra-ministerial agencies.',
    '2026-10-02'
),
(
    'RES-004',
    'National Ethics & Anti-Corruption Code for Young Public Officers',
    'Compliance Code',
    'Independent Corrupt Practices Commission (ICPC) & Code of Conduct Bureau (CCB)',
    'PDF',
    '2.1 MB',
    'docs/Public_Officer_Ethics_Manual.pdf',
    612,
    'Comprehensive guidance on conflict of interest disclosure, asset declarations, whistleblower protection mechanisms, and transparency standards for emerging leaders.',
    '2026-08-25'
)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    category = EXCLUDED.category,
    publishing_mda = EXCLUDED.publishing_mda,
    file_type = EXCLUDED.file_type;

-- Seed Gallery Albums
INSERT INTO public.gallery_albums (
    id, title, category, location, date, description, images, cover_image, date_added
) VALUES
(
    'GAL-001',
    'Inauguration of NCSYF National Executive Council',
    'Inauguration & Ceremonies',
    'State House Banquet Hall, Presidential Villa, Abuja',
    '2026-09-08',
    'Official swearing-in of the 2026–2028 National Executive Council by representatives of the Head of the Civil Service of the Federation.',
    '["images/gallery_presidential_inauguration.jpg", "images/african-youth-civil-servants.jpg"]'::jsonb,
    'images/gallery_presidential_inauguration.jpg',
    '2026-09-08'
),
(
    'GAL-002',
    'South-West Regional Youth Public Servants Town Hall',
    'Town Halls & Seminars',
    'Federal Secretariat Complex Conference Pavilion, Ibadan, Oyo State',
    '2026-09-22',
    'Over 600 young federal and state civil servants gathered to deliberate on civil service modernization, promotion benchmarks, and welfare modernization.',
    '["images/gallery_state_inauguration.jpg"]'::jsonb,
    'images/gallery_state_inauguration.jpg',
    '2026-09-22'
),
(
    'GAL-003',
    'Civil Service E-Governance & Artificial Intelligence Workshop',
    'Training & Workshops',
    'Digital Transformation Academy, Area 1, Garki, Abuja',
    '2026-09-29',
    'Hands-on practical training equipping desk officers with AI productivity tools, secure data pipelines, and electronic document routing techniques.',
    '["images/gallery_digital_training.jpg", "images/project_agritech.jpg"]'::jsonb,
    'images/gallery_digital_training.jpg',
    '2026-09-29'
),
(
    'GAL-004',
    'Primary Healthcare Community Outreach & Health Mission',
    'Community Outreach',
    'Kano State Chapter & FCT Area Councils',
    '2026-10-04',
    'Youth civil servants in public health cadres conducting grassroots health assessments, immunization logistic verification, and medical supply audits.',
    '["images/project_healthcare.jpg", "images/african-youth-civil-servants.jpg"]'::jsonb,
    'images/project_healthcare.jpg',
    '2026-10-04'
)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    category = EXCLUDED.category,
    location = EXCLUDED.location,
    images = EXCLUDED.images;

-- Seed Superadmin in public.admin_users
DO $$
BEGIN
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
END $$;

-- Dedicated Admin Roster Access RPC
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
