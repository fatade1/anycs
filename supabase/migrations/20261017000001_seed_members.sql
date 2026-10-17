-- ==========================================================================
-- NCSYF SEED MEMBERS MIGRATION (CLEARED FOR FRESH START)
-- Nigeria Civil Service Youths' Forum (NCSYF)
-- Migration: 20261017000001_seed_members.sql
-- ==========================================================================
-- Mock seed members have been removed as requested to start fresh with 0 members.
-- All real member records will be generated via portal registration.

-- Ensure table is clean if demo records were previously seeded:
DELETE FROM public.member_profiles 
WHERE member_id IN (
    'NCSYF-1995-0001',
    'NCSYF-1998-0001',
    'NCSYF-1987-0001',
    'NCSYF-1996-0001',
    'NCSYF-1999-0001'
);
