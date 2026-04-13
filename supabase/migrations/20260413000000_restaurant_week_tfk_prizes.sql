-- Restaurant Week TFK Prize Deals
-- Add $25 prize deals to 7 restaurants during Restaurant Week (April 13-19, 2026)
-- These are non-claimable deals that navigate to the Thirsty for Knowledge trivia screen

INSERT INTO public.coupons (
  restaurant_id,
  title,
  description,
  discount_type,
  cta_type,
  cta_label,
  start_date,
  end_date,
  days_of_week,
  is_active,
  max_claims_total,
  max_claims_per_user
) VALUES
  -- The Gloomy Rooster
  (
    'a0bcf79a-0ee7-438e-a056-d2f51b973d40',
    '$25 TasteLanc Prize',
    'Play Thirsty for Knowledge trivia during Restaurant Week for a chance to win $25! Prizes awarded nightly in the app.',
    'custom',
    'learn_more',
    'View TFK Schedule',
    '2026-04-13',
    '2026-04-19',
    '{}',
    true,
    NULL,
    1
  ),
  -- Cabbage Hill Schnitzel Haus
  (
    'f2fbcb96-0ea3-4c7b-a9a6-4e4231753071',
    '$25 TasteLanc Prize',
    'Play Thirsty for Knowledge trivia during Restaurant Week for a chance to win $25! Prizes awarded nightly in the app.',
    'custom',
    'learn_more',
    'View TFK Schedule',
    '2026-04-13',
    '2026-04-19',
    '{}',
    true,
    NULL,
    1
  ),
  -- Trio Bar and Grill
  (
    '53deabc0-7d15-4a5e-80c2-2dac17b5a4bc',
    '$25 TasteLanc Prize',
    'Play Thirsty for Knowledge trivia during Restaurant Week for a chance to win $25! Prizes awarded nightly in the app.',
    'custom',
    'learn_more',
    'View TFK Schedule',
    '2026-04-13',
    '2026-04-19',
    '{}',
    true,
    NULL,
    1
  ),
  -- Antonio's Pizza House
  (
    '2d62b56d-5119-438d-bc59-f75ea75d8b69',
    '$25 TasteLanc Prize',
    'Play Thirsty for Knowledge trivia during Restaurant Week for a chance to win $25! Prizes awarded nightly in the app.',
    'custom',
    'learn_more',
    'View TFK Schedule',
    '2026-04-13',
    '2026-04-19',
    '{}',
    true,
    NULL,
    1
  ),
  -- The Bunker at Crossgates
  (
    'f729df6a-2168-4b74-bfb3-c8bebf78f732',
    '$25 TasteLanc Prize',
    'Play Thirsty for Knowledge trivia during Restaurant Week for a chance to win $25! Prizes awarded nightly in the app.',
    'custom',
    'learn_more',
    'View TFK Schedule',
    '2026-04-13',
    '2026-04-19',
    '{}',
    true,
    NULL,
    1
  ),
  -- Josie's Pub
  (
    'cc6c7f2b-9eec-43f5-9565-5f76c7f06e2c',
    '$25 TasteLanc Prize',
    'Play Thirsty for Knowledge trivia during Restaurant Week for a chance to win $25! Prizes awarded nightly in the app.',
    'custom',
    'learn_more',
    'View TFK Schedule',
    '2026-04-13',
    '2026-04-19',
    '{}',
    true,
    NULL,
    1
  ),
  -- Vécu
  (
    '41015c8a-9589-4c37-9d2a-2802ead8dad7',
    '$25 TasteLanc Prize',
    'Play Thirsty for Knowledge trivia during Restaurant Week for a chance to win $25! Prizes awarded nightly in the app.',
    'custom',
    'learn_more',
    'View TFK Schedule',
    '2026-04-13',
    '2026-04-19',
    '{}',
    true,
    NULL,
    1
  );
