-- Enable Fayetteville in cross-market promotion by adding an instagram_accounts row.
-- The is_active = true flag is what the get_markets_with_instagram() RPC requires.
-- Actual Instagram posting credentials (business_account_id, page_id, access_token)
-- will be added later when the Instagram agent is configured for Fayetteville.
INSERT INTO public.instagram_accounts (
  market_id,
  instagram_business_account_id,
  facebook_page_id,
  access_token_encrypted,
  is_active
)
SELECT
  m.id,
  'pending',
  'pending',
  'pending',
  true
FROM public.markets m
WHERE m.slug = 'fayetteville-nc'
ON CONFLICT (market_id) DO UPDATE SET is_active = true;
