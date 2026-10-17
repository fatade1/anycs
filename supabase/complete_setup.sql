-- ==========================================================================
-- NIGERIA CIVIL SERVICE YOUTHS' FORUM (NCSYF)
-- COMPLETE SUPABASE DATABASE SETUP & CLOUD STORAGE INITIALIZATION
-- ==========================================================================
-- Instructions:
-- 1. Open your Supabase Project Dashboard (https://app.supabase.com)
-- 2. Click "SQL Editor" in the left sidebar
-- 3. Click "New query", paste the entire contents of this file, and click "Run"
-- 4. All tables, triggers, Row Level Security (RLS) policies, storage buckets,
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
-- 2. MEMBER PROFILES TABLE (PUBLIC.MEMBER_PROFILES)
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
    IF (auth.role() = 'authenticated') THEN
        IF (NEW.member_id <> OLD.member_id) THEN
            RAISE EXCEPTION 'Access Denied: Member ID cannot be modified by member.';
        END IF;
        IF (NEW.user_id <> OLD.user_id) THEN
            RAISE EXCEPTION 'Access Denied: User identity linkage cannot be changed.';
        END IF;
        IF (NEW.status <> OLD.status) THEN
            RAISE EXCEPTION 'Access Denied: Membership verification status can only be modified by the Secretariat.';
        END IF;
        IF (NEW.category <> OLD.category) THEN
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

-- Row Level Security (RLS) for Member Profiles
ALTER TABLE public.member_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view own profile" ON public.member_profiles;
CREATE POLICY "Members can view own profile"
    ON public.member_profiles FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public can verify member validity" ON public.member_profiles;
CREATE POLICY "Public can verify member validity"
    ON public.member_profiles FOR SELECT
    TO anon
    USING (status = 'verified');

DROP POLICY IF EXISTS "Applicants can submit registration profiles" ON public.member_profiles;
CREATE POLICY "Applicants can submit registration profiles"
    ON public.member_profiles FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "Members can update permitted own profile fields" ON public.member_profiles;
CREATE POLICY "Members can update permitted own profile fields"
    ON public.member_profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role has full management access" ON public.member_profiles;
CREATE POLICY "Service role has full management access"
    ON public.member_profiles FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ==========================================================================
-- 3. PUBLIC INITIATIVES & PROJECTS TABLE (PUBLIC.PROJECTS)
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
    USING (true)
    WITH CHECK (true);

-- ==========================================================================
-- 4. OFFICIAL CIRCULARS & RESOURCES TABLE (PUBLIC.RESOURCES)
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
CREATE POLICY "Public can increment resource download count"
    ON public.resources FOR UPDATE
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can manage resources" ON public.resources;
CREATE POLICY "Admins can manage resources"
    ON public.resources FOR ALL
    TO authenticated, service_role
    USING (true)
    WITH CHECK (true);

-- ==========================================================================
-- 5. MEDIA GALLERY & PHOTO ALBUMS TABLE (PUBLIC.GALLERY_ALBUMS)
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
    USING (true)
    WITH CHECK (true);

-- ==========================================================================
-- 6. ADMINISTRATIVE PERSONNEL TABLE (PUBLIC.ADMIN_USERS)
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

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view and manage admin accounts" ON public.admin_users;
CREATE POLICY "Admins can view and manage admin accounts"
    ON public.admin_users FOR ALL
    TO authenticated, service_role
    USING (true)
    WITH CHECK (true);

-- ==========================================================================
-- 7. SUPABASE STORAGE BUCKETS SETUP
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
CREATE POLICY "Admins have full access to storage buckets"
    ON storage.objects FOR ALL
    TO authenticated, service_role
    USING (true)
    WITH CHECK (true);

-- ==========================================================================
-- 8. COMPREHENSIVE INITIAL SEED DATA
-- ==========================================================================

-- Seed Initial Realistic Members
INSERT INTO public.member_profiles (
    member_id, email, first_name, last_name, category, member_type_label,
    dob, age, gender, phone, tier, tier_label, mda, state_chapter, staff_id,
    doc_type, doc_type_label, status, registered_at
) VALUES
(
    'NCSYF-1995-0001',
    'amina.ibrahim@health.gov.ng',
    'Amina',
    'Ibrahim',
    'full',
    'Full Member (18–35 yrs)',
    '1995-04-12',
    31,
    'female',
    '+234 803 219 4012',
    'federal',
    'Federal Government MDA',
    'Federal Ministry of Health & Social Welfare, Abuja',
    'FCT Abuja',
    'FMoH/2019/0842',
    'staff_id_card',
    'Official Staff Identification Card',
    'verified',
    '2026-09-28 14:22:10+01'
),
(
    'NCSYF-1998-0001',
    'chidi.okonkwo@nitda.gov.ng',
    'Chidiebere',
    'Okonkwo',
    'full',
    'Full Member (18–35 yrs)',
    '1998-11-05',
    27,
    'male',
    '+234 812 873 9921',
    'federal',
    'Federal Government MDA',
    'National Information Technology Development Agency (NITDA)',
    'FCT Abuja',
    'NITDA/TS/2021/319',
    'appointment_letter',
    'Valid Letter of Employment / Appointment',
    'verified',
    '2026-09-29 09:14:05+01'
),
(
    'NCSYF-1987-0001',
    'badeleke@lagosstate.gov.ng',
    'Babatunde',
    'Adeleke',
    'associate',
    'Associate Member (After 35 yrs / Alumni)',
    '1987-03-18',
    39,
    'male',
    '+234 802 334 1180',
    'state',
    'State Government MDA',
    'Lagos State Ministry of Science & Technology',
    'Lagos',
    'LASG/ST/04118',
    'gazette',
    'Official Civil Service Gazette Notice',
    'verified',
    '2026-09-29 16:45:30+01'
),
(
    'NCSYF-1996-0001',
    'fbello@kano.gov.ng',
    'Fatima',
    'Bello',
    'full',
    'Full Member (18–35 yrs)',
    '1996-08-22',
    30,
    'female',
    '+234 806 771 2004',
    'state',
    'State Government MDA',
    'Kano State Civil Service Commission',
    'Kano',
    'KNS/CSC/2020/094',
    'staff_id_card',
    'Official Staff Identification Card',
    'pending',
    '2026-10-01 11:05:44+01'
),
(
    'NCSYF-1999-0001',
    'tari.ebikeme@bayelsa.gov.ng',
    'Tari',
    'Ebikeme',
    'full',
    'Full Member (18–35 yrs)',
    '1999-02-14',
    27,
    'male',
    '+234 807 552 9013',
    'state',
    'State Government MDA',
    'Bayelsa State Ministry of Environment',
    'Bayelsa',
    'BY/ENV/2022/108',
    'staff_id_card',
    'Official Staff Identification Card',
    'disapproved',
    '2026-10-03 13:20:00+01'
)
ON CONFLICT (email) DO UPDATE SET
    member_id = EXCLUDED.member_id,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    status = EXCLUDED.status,
    mda = EXCLUDED.mda;

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
    'active',
    'Active Implementation',
    'All Federal MDAs',
    '₦40,000,000',
    'An open-source procurement analytics dashboard managed by young procurement and finance officers to track contract delivery benchmarks.',
    '["images/project_governance.jpg"]'::jsonb,
    '2026-10-01'
)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    sector = EXCLUDED.sector,
    lead_mda = EXCLUDED.lead_mda,
    status = EXCLUDED.status,
    description = EXCLUDED.description,
    images = EXCLUDED.images;

-- Seed Resources
INSERT INTO public.resources (
    id, title, category, publishing_mda, file_type, file_size, file_url, downloads, description, date_added
) VALUES
(
    'RES-001',
    'Federal Public Service Rules (PSR) 2026 Youth Operational Handbook',
    'Legal Framework & Bye-laws',
    'Office of the Head of Civil Service of the Federation (OHCSF)',
    'PDF',
    '4.2 MB',
    '#',
    1420,
    'Complete annotated guide to public service ethics, promotion guidelines, discipline, and career progression for young civil servants.',
    '2026-09-10'
),
(
    'RES-002',
    'NCSYF Constitution & National Bye-laws (Adopted 2026)',
    'Constitution & Charter',
    'Nigeria Civil Service Youths'' Forum Secretariat',
    'PDF',
    '2.8 MB',
    '#',
    2890,
    'The foundational legal charter defining membership rights, NEC governance, State Chapter structures, and election guidelines.',
    '2026-09-12'
),
(
    'RES-003',
    'Civil Service AI Literacy & Data Protection (NDPA 2023) Guidelines',
    'Policy Brief & Circular',
    'Nigeria Data Protection Commission (NDPC) & NITDA',
    'PDF',
    '1.9 MB',
    '#',
    980,
    'Standards and technical guidance for processing government records in compliance with the Nigeria Data Protection Act 2023.',
    '2026-09-25'
),
(
    'RES-004',
    'Monitoring & Evaluation (M&E) Framework for Youth Civil Service Projects',
    'Training Manual & Toolkit',
    'National Planning Commission / FMF',
    'DOCX',
    '1.1 MB',
    '#',
    650,
    'Step-by-step toolkit with KPI scorecards, reporting templates, and audit benchmarks for MDA project coordinators.',
    '2026-10-02'
)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    category = EXCLUDED.category,
    publishing_mda = EXCLUDED.publishing_mda,
    file_type = EXCLUDED.file_type,
    downloads = EXCLUDED.downloads;

-- Seed Gallery Albums
INSERT INTO public.gallery_albums (
    id, title, category, location, date, description, images, cover_image, date_added
) VALUES
(
    'GAL-001',
    'National Public Service Innovation Summit 2026',
    'Summits & Conferences',
    'International Conference Centre, Abuja FCT',
    '2026-09-18',
    'High-level federal assembly gathering 1,500+ young civil servants from all 36 States and FCT to formulate digital service delivery roadmaps and paperless workflows.',
    '["images/gallery_national_summit.jpg", "images/african-youth-civil-servants.jpg", "images/project_digital_office.jpg"]'::jsonb,
    'images/gallery_national_summit.jpg',
    '2026-09-18'
),
(
    'GAL-002',
    'State Chapter Official Leadership Inauguration & Induction',
    'State Chapter Invocations',
    'Public Service Staff Hall, Lagos & FCT Secretariat',
    '2026-09-22',
    'Formal swearing-in ceremony for newly appointed State Chapter Executive Committees and zonal youth coordinators driving Track B public service modernization.',
    '["images/gallery_state_inauguration.jpg", "images/project_governance.jpg"]'::jsonb,
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
INSERT INTO public.admin_users (
    id, name, email, role, role_label, status, created_at
) VALUES
(
    'ADM-001',
    'National Secretariat Super Admin',
    'admin@ncsyf.com.ng',
    'super_admin',
    'Super Administrator',
    'active',
    '2026-09-01 08:00:00+01'
)
ON CONFLICT (email) DO UPDATE SET
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    role_label = EXCLUDED.role_label,
    status = EXCLUDED.status;
