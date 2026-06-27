ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "notify_audit_complete" boolean DEFAULT true NOT NULL,
  ADD COLUMN IF NOT EXISTS "notify_weekly_digest" boolean DEFAULT true NOT NULL,
  ADD COLUMN IF NOT EXISTS "notify_critical_only" boolean DEFAULT false NOT NULL;
