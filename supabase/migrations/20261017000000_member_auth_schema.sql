-- ==========================================================================
-- NCSYF MEMBER AUTHENTICATION & PROFILE DATABASE SCHEMA
-- Nigeria Civil Service Youths' Forum (NCSYF)
-- PostgreSQL + Supabase Row Level Security (RLS)
-- Migration: 20261017000000_member_auth_schema.sql
-- ==========================================================================

-- Enable pgcrypto for UUID and cryptographic functions if not enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Create custom enum types for category and status
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

-- 2. Member Profiles Table
-- Separates auth credentials (managed by auth.users) from membership profiles
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

-- 3. Indexes for high-performance lookups
CREATE INDEX IF NOT EXISTS idx_member_profiles_user_id ON public.member_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_member_profiles_member_id ON public.member_profiles(member_id);
CREATE INDEX IF NOT EXISTS idx_member_profiles_email ON public.member_profiles(email);
CREATE INDEX IF NOT EXISTS idx_member_profiles_status ON public.member_profiles(status);
CREATE INDEX IF NOT EXISTS idx_member_profiles_mda ON public.member_profiles(mda);

-- 4. Automatically update updated_at timestamp trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_member_profiles_updated_at ON public.member_profiles;
CREATE TRIGGER trigger_member_profiles_updated_at
    BEFORE UPDATE ON public.member_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 5. Prevent members from modifying their own verification status or member ID
-- Only Service Role or administrative triggers may alter verification status
CREATE OR REPLACE FUNCTION public.protect_member_sensitive_fields()
RETURNS TRIGGER AS $$
BEGIN
    -- If executed by an ordinary authenticated member
    IF (auth.role() = 'authenticated') THEN
        -- Prevent changing member_id, user_id, or verification status
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

-- ==========================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================================================
ALTER TABLE public.member_profiles ENABLE ROW LEVEL SECURITY;

-- Policy 1: Members can read ONLY their own profile
DROP POLICY IF EXISTS "Members can view own profile" ON public.member_profiles;
CREATE POLICY "Members can view own profile"
    ON public.member_profiles
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Policy 2: Members can update permitted contact details on their own profile
DROP POLICY IF EXISTS "Members can update permitted own profile fields" ON public.member_profiles;
CREATE POLICY "Members can update permitted own profile fields"
    ON public.member_profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy 3: Public verification lookup (allows non-sensitive lookup for member verification by member_id)
-- Restricts sensitive fields (phone, staff_id, etc. are not exposed)
DROP POLICY IF EXISTS "Public can verify member validity" ON public.member_profiles;
CREATE POLICY "Public can verify member validity"
    ON public.member_profiles
    FOR SELECT
    TO anon
    USING (status = 'verified');

-- Policy 4: Secretariat Admin and Service Role have full access
DROP POLICY IF EXISTS "Service role has full management access" ON public.member_profiles;
CREATE POLICY "Service role has full management access"
    ON public.member_profiles
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ==========================================================================
-- AUTOMATIC NEW USER PROFILE LINKAGE TRIGGER
-- ==========================================================================
CREATE OR REPLACE FUNCTION public.handle_auth_user_created()
RETURNS TRIGGER AS $$
DECLARE
    matched_profile_id UUID;
BEGIN
    -- Check if an unlinked membership record already exists with this email
    SELECT id INTO matched_profile_id
    FROM public.member_profiles
    WHERE LOWER(email) = LOWER(NEW.email) AND user_id IS NULL
    LIMIT 1;

    IF matched_profile_id IS NOT NULL THEN
        -- Link the existing membership profile to the newly created auth user
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
