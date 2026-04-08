-- Add CTA type to coupons so restaurant owners can choose the button action
-- e.g. "Claim Deal", "Leave a Recommendation", "Learn More", "Show to Staff"
ALTER TABLE coupons
  ADD COLUMN IF NOT EXISTS cta_type text NOT NULL DEFAULT 'claim_deal',
  ADD COLUMN IF NOT EXISTS cta_label text;

COMMENT ON COLUMN coupons.cta_type IS 'Preset CTA action: claim_deal, leave_recommendation, learn_more, show_to_staff, custom';
COMMENT ON COLUMN coupons.cta_label IS 'Custom button label (used when cta_type = custom, otherwise optional override)';
