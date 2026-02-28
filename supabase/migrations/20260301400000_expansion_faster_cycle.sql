-- ============================================================
-- Expansion Agent: Faster Cycle (6h → 2h)
-- ============================================================

-- Update pg_cron schedule from every 6 hours to every 2 hours
-- Old: '30 */6 * * *' (at :30 past every 6th hour)
-- New: '30 */2 * * *' (at :30 past every 2nd hour)

SELECT cron.unschedule('expansion-agent');

SELECT cron.schedule(
  'expansion-agent',
  '30 */2 * * *',
  $$SELECT public.trigger_expansion_agent()$$
);
