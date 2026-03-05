-- Email drafts table for persistent draft storage
CREATE TABLE public.email_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  draft_type TEXT NOT NULL DEFAULT 'new' CHECK (draft_type IN ('new', 'reply')),
  recipient_email TEXT,
  recipient_name TEXT,
  subject TEXT,
  headline TEXT,
  body TEXT,
  cta_text TEXT,
  cta_url TEXT,
  sender_email TEXT,
  sender_name TEXT,
  reply_to_email TEXT,
  in_reply_to_message_id TEXT,
  attachments JSONB DEFAULT '[]',
  inbox_type TEXT DEFAULT 'crm',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_email_drafts_user_id ON public.email_drafts(user_id);
CREATE INDEX idx_email_drafts_updated_at ON public.email_drafts(updated_at DESC);

-- RLS
ALTER TABLE public.email_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own drafts"
  ON public.email_drafts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own drafts"
  ON public.email_drafts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own drafts"
  ON public.email_drafts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own drafts"
  ON public.email_drafts FOR DELETE
  USING (auth.uid() = user_id);
