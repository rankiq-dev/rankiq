ALTER TABLE "audits" ADD COLUMN IF NOT EXISTS "share_token" text UNIQUE;
