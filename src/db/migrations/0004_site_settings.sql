ALTER TABLE "sites"
  ADD COLUMN IF NOT EXISTS "audit_schedule" text DEFAULT 'weekly' NOT NULL,
  ADD COLUMN IF NOT EXISTS "max_pages" integer DEFAULT 200 NOT NULL;
