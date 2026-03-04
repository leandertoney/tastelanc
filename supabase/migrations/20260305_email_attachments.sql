-- Add attachments column to email_sends for outbound email attachment metadata
ALTER TABLE public.email_sends
  ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]';

COMMENT ON COLUMN public.email_sends.attachments IS 'Array of attachment metadata: [{url, filename, size, contentType}]';
