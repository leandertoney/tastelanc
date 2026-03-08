-- Health check monitoring system
-- Stores results of automated health checks and alert history

-- Stores results of each health check run
CREATE TABLE health_check_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  overall_status TEXT NOT NULL CHECK (overall_status IN ('healthy', 'degraded', 'down')),
  checks JSONB NOT NULL DEFAULT '[]'::jsonb,
  alerts_sent BOOLEAN DEFAULT FALSE,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_health_check_results_checked_at ON health_check_results(checked_at DESC);

-- Tracks alert throttling (prevents email spam for the same issue)
CREATE TABLE health_alert_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name TEXT NOT NULL,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('down', 'degraded', 'recovered')),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  details JSONB
);

CREATE INDEX idx_health_alert_log_service ON health_alert_log(service_name, sent_at DESC);

-- RLS: allow service role full access (cron uses service role client)
ALTER TABLE health_check_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_alert_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on health_check_results"
  ON health_check_results FOR ALL USING (true);

CREATE POLICY "Service role full access on health_alert_log"
  ON health_alert_log FOR ALL USING (true);

-- Auto-cleanup: delete health check results older than 30 days
-- (keeps the table from growing unbounded)
CREATE OR REPLACE FUNCTION cleanup_old_health_checks() RETURNS void AS $$
BEGIN
  DELETE FROM health_check_results WHERE checked_at < NOW() - INTERVAL '30 days';
  DELETE FROM health_alert_log WHERE sent_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup daily at 3am ET (via pg_cron if available)
-- SELECT cron.schedule('cleanup-health-checks', '0 8 * * *', 'SELECT cleanup_old_health_checks()');
