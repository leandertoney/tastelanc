-- Portal access control flag.
-- Gates the admin panel behind a billing status check that can be flipped
-- with a single UPDATE, with no redeploy required.

CREATE TABLE IF NOT EXISTS portal_access (
  id           text PRIMARY KEY DEFAULT 'singleton',
  is_locked    boolean NOT NULL DEFAULT false,
  message      text NOT NULL DEFAULT 'Payment overdue. Please complete payment in order to regain access to your account.',
  locked_at    timestamptz,
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT portal_access_singleton CHECK (id = 'singleton')
);

ALTER TABLE portal_access ENABLE ROW LEVEL SECURITY;

-- No policies on purpose. All reads and writes go through the service role
-- (middleware) or the dashboard SQL editor, so anon and authenticated clients
-- cannot read the flag or discover the lock state.

INSERT INTO portal_access (id, is_locked)
VALUES ('singleton', false)
ON CONFLICT (id) DO NOTHING;
