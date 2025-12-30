-- Add scheduled_campaign_id to email_sends for automation tracking
ALTER TABLE email_sends
ADD COLUMN IF NOT EXISTS scheduled_campaign_id UUID REFERENCES scheduled_campaigns(id) ON DELETE SET NULL;

-- Index for querying automation sends
CREATE INDEX IF NOT EXISTS idx_email_sends_scheduled_campaign
ON email_sends(scheduled_campaign_id) WHERE scheduled_campaign_id IS NOT NULL;

-- Add tracking columns to scheduled_campaigns (matching email_campaigns)
ALTER TABLE scheduled_campaigns
ADD COLUMN IF NOT EXISTS total_opened INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_clicked INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_bounced INTEGER DEFAULT 0;

-- Function to increment scheduled campaign opens
CREATE OR REPLACE FUNCTION increment_scheduled_campaign_opens(p_scheduled_campaign_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE scheduled_campaigns
  SET total_opened = total_opened + 1
  WHERE id = p_scheduled_campaign_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment scheduled campaign clicks
CREATE OR REPLACE FUNCTION increment_scheduled_campaign_clicks(p_scheduled_campaign_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE scheduled_campaigns
  SET total_clicked = total_clicked + 1
  WHERE id = p_scheduled_campaign_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment scheduled campaign bounces
CREATE OR REPLACE FUNCTION increment_scheduled_campaign_bounces(p_scheduled_campaign_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE scheduled_campaigns
  SET total_bounced = total_bounced + 1
  WHERE id = p_scheduled_campaign_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to recalculate campaign totals from email_sends
CREATE OR REPLACE FUNCTION recalculate_campaign_totals(target_campaign_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE email_campaigns
  SET
    total_sent = (
      SELECT COUNT(*) FROM email_sends
      WHERE campaign_id = target_campaign_id
      AND status NOT IN ('failed', 'pending')
    ),
    total_opened = (
      SELECT COUNT(*) FROM email_sends
      WHERE campaign_id = target_campaign_id
      AND opened_at IS NOT NULL
    ),
    total_clicked = (
      SELECT COUNT(*) FROM email_sends
      WHERE campaign_id = target_campaign_id
      AND clicked_at IS NOT NULL
    ),
    total_bounced = (
      SELECT COUNT(*) FROM email_sends
      WHERE campaign_id = target_campaign_id
      AND status = 'bounced'
    )
  WHERE id = target_campaign_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to recalculate scheduled campaign totals from email_sends
CREATE OR REPLACE FUNCTION recalculate_scheduled_campaign_totals(target_scheduled_campaign_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE scheduled_campaigns
  SET
    total_sent = (
      SELECT COUNT(*) FROM email_sends
      WHERE scheduled_campaign_id = target_scheduled_campaign_id
      AND status NOT IN ('failed', 'pending')
    ),
    total_opened = (
      SELECT COUNT(*) FROM email_sends
      WHERE scheduled_campaign_id = target_scheduled_campaign_id
      AND opened_at IS NOT NULL
    ),
    total_clicked = (
      SELECT COUNT(*) FROM email_sends
      WHERE scheduled_campaign_id = target_scheduled_campaign_id
      AND clicked_at IS NOT NULL
    ),
    total_bounced = (
      SELECT COUNT(*) FROM email_sends
      WHERE scheduled_campaign_id = target_scheduled_campaign_id
      AND status = 'bounced'
    )
  WHERE id = target_scheduled_campaign_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
