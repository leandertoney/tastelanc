-- Recalculate totals for all email campaigns from email_sends records
DO $$
DECLARE
  campaign RECORD;
BEGIN
  -- Recalculate each campaign's totals
  FOR campaign IN SELECT DISTINCT campaign_id FROM email_sends WHERE campaign_id IS NOT NULL
  LOOP
    UPDATE email_campaigns
    SET
      total_sent = (
        SELECT COUNT(*) FROM email_sends
        WHERE campaign_id = campaign.campaign_id
        AND status NOT IN ('failed', 'pending')
      ),
      total_opened = (
        SELECT COUNT(*) FROM email_sends
        WHERE campaign_id = campaign.campaign_id
        AND opened_at IS NOT NULL
      ),
      total_clicked = (
        SELECT COUNT(*) FROM email_sends
        WHERE campaign_id = campaign.campaign_id
        AND clicked_at IS NOT NULL
      ),
      total_bounced = (
        SELECT COUNT(*) FROM email_sends
        WHERE campaign_id = campaign.campaign_id
        AND status = 'bounced'
      )
    WHERE id = campaign.campaign_id;

    RAISE NOTICE 'Recalculated campaign %', campaign.campaign_id;
  END LOOP;
END $$;

-- Recalculate totals for all scheduled campaigns from email_sends records
DO $$
DECLARE
  campaign RECORD;
BEGIN
  -- Recalculate each scheduled campaign's totals
  FOR campaign IN SELECT DISTINCT scheduled_campaign_id FROM email_sends WHERE scheduled_campaign_id IS NOT NULL
  LOOP
    UPDATE scheduled_campaigns
    SET
      total_sent = (
        SELECT COUNT(*) FROM email_sends
        WHERE scheduled_campaign_id = campaign.scheduled_campaign_id
        AND status NOT IN ('failed', 'pending')
      ),
      total_opened = (
        SELECT COUNT(*) FROM email_sends
        WHERE scheduled_campaign_id = campaign.scheduled_campaign_id
        AND opened_at IS NOT NULL
      ),
      total_clicked = (
        SELECT COUNT(*) FROM email_sends
        WHERE scheduled_campaign_id = campaign.scheduled_campaign_id
        AND clicked_at IS NOT NULL
      ),
      total_bounced = (
        SELECT COUNT(*) FROM email_sends
        WHERE scheduled_campaign_id = campaign.scheduled_campaign_id
        AND status = 'bounced'
      )
    WHERE id = campaign.scheduled_campaign_id;

    RAISE NOTICE 'Recalculated scheduled campaign %', campaign.scheduled_campaign_id;
  END LOOP;
END $$;

-- Show summary of email_sends
SELECT
  'Total email_sends' as metric,
  COUNT(*)::text as value
FROM email_sends
UNION ALL
SELECT
  'With resend_id' as metric,
  COUNT(*)::text as value
FROM email_sends WHERE resend_id IS NOT NULL
UNION ALL
SELECT
  'Opened' as metric,
  COUNT(*)::text as value
FROM email_sends WHERE opened_at IS NOT NULL
UNION ALL
SELECT
  'Clicked' as metric,
  COUNT(*)::text as value
FROM email_sends WHERE clicked_at IS NOT NULL;
