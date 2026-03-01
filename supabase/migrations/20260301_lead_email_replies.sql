-- CRM Two-Way Email: lead_email_replies table + supporting columns

-- 1. New table for CRM email replies linked to leads
CREATE TABLE IF NOT EXISTS public.lead_email_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.business_leads(id) ON DELETE CASCADE,
  from_email TEXT NOT NULL,
  from_name TEXT,
  to_email TEXT NOT NULL,
  subject TEXT,
  body_text TEXT,
  body_html TEXT,
  in_reply_to TEXT,
  references_header TEXT,
  original_send_id UUID REFERENCES public.email_sends(id) ON DELETE SET NULL,
  thread_id UUID,
  inbound_email_id UUID REFERENCES public.inbound_emails(id) ON DELETE SET NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.lead_email_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access lead_email_replies"
  ON public.lead_email_replies
  FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_lead_email_replies_lead_id ON public.lead_email_replies(lead_id);
CREATE INDEX idx_lead_email_replies_unread ON public.lead_email_replies(is_read) WHERE is_read = false;

-- 2. Unread flag on leads for quick indicators
ALTER TABLE public.business_leads
  ADD COLUMN IF NOT EXISTS has_unread_replies BOOLEAN DEFAULT false;

-- 3. Link inbound emails to leads
ALTER TABLE public.inbound_emails
  ADD COLUMN IF NOT EXISTS linked_lead_id UUID REFERENCES public.business_leads(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_inbound_emails_linked_lead
  ON public.inbound_emails(linked_lead_id) WHERE linked_lead_id IS NOT NULL;

-- 4. Threading support on outbound emails
ALTER TABLE public.email_sends
  ADD COLUMN IF NOT EXISTS thread_id UUID;

ALTER TABLE public.email_sends
  ADD COLUMN IF NOT EXISTS in_reply_to_message_id TEXT;
