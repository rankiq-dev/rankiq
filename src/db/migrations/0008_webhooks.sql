CREATE TABLE IF NOT EXISTS webhooks (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  secret      TEXT NOT NULL,   -- HMAC secret for signature verification
  events      TEXT NOT NULL DEFAULT 'audit.complete', -- comma-separated event types
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_fired_at TIMESTAMPTZ,
  last_status   INTEGER,       -- HTTP status from last delivery
  failure_count INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS webhooks_user_id_idx ON webhooks(user_id);
