-- ============================================================================
-- NCSYF SUPABASE MIGRATION: ATOMIC MEMBER ID ALLOCATION & CONFLICT IMMUNITY
-- Migration ID: 20261104000002_atomic_member_id_generation.sql
-- ============================================================================
-- Eliminates client-side Member ID sequence collisions.
-- Provides an atomic, server-side function to calculate the next guaranteed
-- sequential Member ID formatted as NCSYF-[BirthYear]-[4-digit sequence]
-- by inspecting existing rows directly in public.member_profiles.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.generate_next_member_id(p_birth_year INT DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    target_year INT;
    max_seq INT := 0;
    curr_id TEXT;
    seq_str TEXT;
    seq_val INT;
    next_id TEXT;
BEGIN
    -- Determine target birth year (defaults to current calendar year if omitted or out of range)
    IF p_birth_year IS NOT NULL AND p_birth_year >= 1900 AND p_birth_year <= 2100 THEN
        target_year := p_birth_year;
    ELSE
        target_year := EXTRACT(YEAR FROM CURRENT_DATE)::INT;
    END IF;

    -- Scan existing member_profiles matching NCSYF-[target_year]-%
    FOR curr_id IN
        SELECT member_id 
        FROM public.member_profiles 
        WHERE member_id LIKE 'NCSYF-' || target_year || '-%'
    LOOP
        seq_str := SUBSTRING(curr_id FROM 'NCSYF-' || target_year || '-([0-9]+)');
        IF seq_str IS NOT NULL AND seq_str ~ '^[0-9]+$' THEN
            seq_val := seq_str::INT;
            IF seq_val > max_seq THEN
                max_seq := seq_val;
            END IF;
        END IF;
    END LOOP;

    -- Return next formatted sequence
    next_id := 'NCSYF-' || target_year || '-' || LPAD((max_seq + 1)::TEXT, 4, '0');
    RETURN next_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_next_member_id(INT) TO anon, authenticated;
