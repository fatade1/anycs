-- ============================================================================
-- NCSYF ZEPTOMAIL TRANSACTIONAL EMAIL AUDIT LOGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow TEXT NOT NULL,
    recipient TEXT NOT NULL,
    subject TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'accepted',
    message_id TEXT,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- High-performance lookup indexes
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON public.email_logs(recipient);
CREATE INDEX IF NOT EXISTS idx_email_logs_workflow ON public.email_logs(workflow);
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON public.email_logs(created_at);

-- Row Level Security: Only authorized administrators may view transactional email logs
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'email_logs' 
        AND policyname = 'Admins can view email logs'
    ) THEN
        CREATE POLICY "Admins can view email logs" ON public.email_logs
            FOR SELECT TO authenticated
            USING (public.is_admin());
    END IF;
END $$;
