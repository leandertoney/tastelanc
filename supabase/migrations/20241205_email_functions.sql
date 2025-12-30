-- Functions to increment campaign tracking counts (called by webhook)

CREATE OR REPLACE FUNCTION increment_campaign_opens(campaign_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE email_campaigns
  SET total_opened = total_opened + 1
  WHERE id = campaign_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_campaign_clicks(campaign_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE email_campaigns
  SET total_clicked = total_clicked + 1
  WHERE id = campaign_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_campaign_bounces(campaign_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE email_campaigns
  SET total_bounced = total_bounced + 1
  WHERE id = campaign_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
