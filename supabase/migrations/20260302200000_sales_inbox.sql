-- Sales Inbox: store email body in email_sends + indexes for inbox queries

-- 1. Add body_text and headline to email_sends so sent emails appear in inbox
ALTER TABLE public.email_sends
  ADD COLUMN IF NOT EXISTS body_text TEXT,
  ADD COLUMN IF NOT EXISTS headline TEXT;

-- 2. Index for filtering outbound emails by sender
CREATE INDEX IF NOT EXISTS idx_email_sends_sender_email
  ON public.email_sends(sender_email) WHERE sender_email IS NOT NULL;

-- 3. Index for filtering inbound emails by recipient (to_email)
CREATE INDEX IF NOT EXISTS idx_inbound_emails_to_email
  ON public.inbound_emails(to_email);
