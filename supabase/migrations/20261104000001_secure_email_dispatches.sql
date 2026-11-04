-- ============================================================================
-- NCSYF ZEPTOMAIL TRANSACTIONAL EMAIL AUDIT LOGS & IDEMPOTENCY DISPATCHES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.email_dispatches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idempotency_key TEXT UNIQUE NOT NULL,
    workflow TEXT NOT NULL,
    recipient TEXT NOT NULL,
    member_id TEXT,
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'accepted', 'delivered', 'bounced', 'failed', 'duplicate_suppressed')),
    subject TEXT,
    message_id TEXT,
    error_message TEXT,
    ip_address TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique index to guarantee absolute duplicate prevention across all serverless instances
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_dispatches_idempotency_key ON public.email_dispatches(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_email_dispatches_recipient_created ON public.email_dispatches(recipient, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_dispatches_workflow ON public.email_dispatches(workflow);
CREATE INDEX IF NOT EXISTS idx_email_dispatches_created ON public.email_dispatches(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.email_dispatches ENABLE ROW LEVEL SECURITY;

-- Security Policy: Strictly only authenticated administrators can query email dispatches
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'email_dispatches' 
        AND policyname = 'Admins can view email dispatches'
    ) THEN
        CREATE POLICY "Admins can view email dispatches" ON public.email_dispatches
            FOR SELECT TO authenticated
            USING (public.is_admin());
    END IF;
END $$;
