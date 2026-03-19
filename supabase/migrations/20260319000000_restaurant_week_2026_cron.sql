-- Schedule Restaurant Week 2026 auto-activation at midnight ET on April 1, 2026.
-- April 1 midnight Eastern = 04:00 UTC (EDT = UTC-4).
--
-- Requires pg_cron extension (enabled by default on Supabase Pro/Team plans).
-- If pg_cron is not available, activate manually via admin panel on April 1.

select cron.schedule(
  'activate-restaurant-week-2026',   -- job name (unique)
  '0 4 1 4 *',                        -- cron: 04:00 UTC = midnight ET on April 1
  $$
    update public.holiday_specials
    set is_active = true
    where holiday_tag = 'restaurant-week-2026'
      and is_active = false;
  $$
);
